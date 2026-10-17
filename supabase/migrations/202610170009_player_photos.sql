begin;
create type public.photo_state as enum('pending_upload','pending_review','approved','rejected','revoked');
create table public.player_photo_assets(
 id uuid primary key,player_id uuid not null references public.players(id) on delete restrict,
 uploader_id uuid not null references public.staff_accounts(id) on delete restrict,state public.photo_state not null default 'pending_upload',
 photo_path text not null unique,evidence_path text not null unique,
 photo_mime text not null check(photo_mime in('image/jpeg','image/png','image/webp')),
 evidence_mime text not null check(evidence_mime in('image/jpeg','image/png','image/webp','application/pdf')),
 photo_size integer not null check(photo_size between 1 and 5242880),evidence_size integer not null check(evidence_size between 1 and 5242880),
 photo_sha256 text not null check(photo_sha256 ~ '^[0-9a-f]{64}$'),evidence_sha256 text not null check(evidence_sha256 ~ '^[0-9a-f]{64}$'),
 consent_version text not null default 'league-photo-publication-v1',declared_at timestamptz not null default now(),
 reviewed_by uuid references public.staff_accounts(id) on delete restrict,reviewed_at timestamptz,review_reason text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.public_player_photos(
 player_id uuid primary key references public.players(id) on delete restrict,
 asset_id uuid not null unique references public.player_photo_assets(id) on delete restrict,
 content_base64 text not null check(octet_length(content_base64)<=349528),
 mime_type text not null default 'image/jpeg' check(mime_type='image/jpeg'),
 content_sha256 text not null check(content_sha256 ~ '^[0-9a-f]{64}$'),updated_at timestamptz not null default now()
);
create index player_photo_history on public.player_photo_assets(player_id,created_at desc);
create trigger photo_assets_updated before update on public.player_photo_assets for each row execute function private.set_updated_at();
alter table public.player_photo_assets enable row level security;
alter table public.public_player_photos enable row level security;
revoke all on public.player_photo_assets,public.public_player_photos from anon,authenticated;
grant select on public.player_photo_assets to authenticated;
grant select on public.public_player_photos to anon,authenticated;
create policy photo_staff_scope on public.player_photo_assets for select to authenticated using(private.can_manage_player(player_id));
create function public.is_player_photo_approved(asset uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.player_photo_assets where id=asset and state='approved');
$$;
revoke all on function public.is_player_photo_approved(uuid) from public;
grant execute on function public.is_player_photo_approved(uuid) to anon,authenticated;
create policy published_photos on public.public_player_photos for select to anon,authenticated using(public.is_player_photo_approved(asset_id));

create function public.begin_player_photo(asset uuid,player uuid,photo_mime text,evidence_mime text,photo_size integer,evidence_size integer,photo_hash text,evidence_hash text,permission_confirmed boolean)
returns public.player_photo_assets language plpgsql security definer set search_path='' as $$
declare old public.player_photo_assets; value public.player_photo_assets; role_value public.staff_role;
begin
 perform pg_advisory_xact_lock(170009);
 if not private.can_manage_player(player) or not (private.has_staff_role('trainer') or private.has_staff_role('organizer')) then raise exception 'Photo upload permission required' using errcode='42501'; end if;
 if permission_confirmed is distinct from true or asset is null then raise exception 'Written guardian permission required' using errcode='22023'; end if;
 select * into old from public.player_photo_assets where id=asset for update;
 if found then
  if old.player_id<>player or old.uploader_id<>auth.uid() or old.photo_mime is distinct from photo_mime or old.evidence_mime is distinct from evidence_mime or old.photo_size is distinct from photo_size or old.evidence_size is distinct from evidence_size or old.photo_sha256 is distinct from photo_hash or old.evidence_sha256 is distinct from evidence_hash then raise exception 'Photo upload payload conflict' using errcode='22023'; end if;
  return old;
 end if;
 insert into public.player_photo_assets(id,player_id,uploader_id,photo_path,evidence_path,photo_mime,evidence_mime,photo_size,evidence_size,photo_sha256,evidence_sha256)
 values(asset,player,auth.uid(),player||'/'||asset||'/original',player||'/'||asset||'/consent',photo_mime,evidence_mime,photo_size,evidence_size,photo_hash,evidence_hash) returning * into value;
 role_value:=case when private.has_staff_role('organizer') then 'organizer'::public.staff_role else 'trainer'::public.staff_role end;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),role_value,'photo.upload_started',asset,'player_photo',jsonb_build_object('player_id',player,'state','pending_upload','consent_version',value.consent_version));
 return value;
end;
$$;
create function private.can_upload_photo_object(path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.player_photo_assets a where a.state='pending_upload' and a.uploader_id=auth.uid() and (a.photo_path=path or a.evidence_path=path) and private.can_manage_player(a.player_id) and (private.has_staff_role('trainer') or private.has_staff_role('organizer')));
$$;
create function private.can_read_photo_object(path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.player_photo_assets a where private.can_manage_player(a.player_id) and (a.photo_path=path or (a.evidence_path=path and (a.uploader_id=auth.uid() or private.has_staff_role('organizer')))));
$$;
revoke all on function private.can_upload_photo_object(text),private.can_read_photo_object(text) from public,anon;
grant execute on function private.can_upload_photo_object(text),private.can_read_photo_object(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('player-private','player-private',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']);
create policy private_photo_insert on storage.objects for insert to authenticated with check(bucket_id='player-private' and private.can_upload_photo_object(name));
create policy private_photo_read on storage.objects for select to authenticated using(bucket_id='player-private' and private.can_read_photo_object(name));

create function public.finish_player_photo(asset uuid) returns void language plpgsql security definer set search_path='' as $$
declare value public.player_photo_assets; role_value public.staff_role;
begin
 perform pg_advisory_xact_lock(170009);
 select * into value from public.player_photo_assets where id=asset for update;
 if not found or value.uploader_id<>auth.uid() or not private.can_manage_player(value.player_id) or not(private.has_staff_role('trainer') or private.has_staff_role('organizer')) then raise exception 'Photo upload permission required' using errcode='42501'; end if;
 if value.state='pending_review' then return; end if;
 if value.state<>'pending_upload' then raise exception 'Upload already reviewed' using errcode='22023'; end if;
 if not exists(select 1 from storage.objects where bucket_id='player-private' and name=value.photo_path and metadata->>'mimetype'=value.photo_mime and (metadata->>'size')::bigint=value.photo_size) or not exists(select 1 from storage.objects where bucket_id='player-private' and name=value.evidence_path and metadata->>'mimetype'=value.evidence_mime and (metadata->>'size')::bigint=value.evidence_size) then raise exception 'Both private uploads required' using errcode='22023'; end if;
 update public.player_photo_assets set state='pending_review' where id=asset;
 role_value:=case when private.has_staff_role('organizer') then 'organizer'::public.staff_role else 'trainer'::public.staff_role end;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state) values(auth.uid(),role_value,'photo.upload_completed',asset,'player_photo',jsonb_build_object('state','pending_upload'),jsonb_build_object('state','pending_review'));
end;
$$;
create function public.review_player_photo(asset uuid,decision text,reason text,publication jsonb default null)
returns void language plpgsql security definer set search_path='' as $$
declare value public.player_photo_assets; image_bytes bytea; image_hash text; previous public.photo_state;
begin
 perform private.require_organizer();
 perform pg_advisory_xact_lock(170009);
 select * into value from public.player_photo_assets where id=asset for update;
 if not found or decision is null or decision not in('approve','reject','revoke') or reason is null or char_length(btrim(reason)) not between 1 and 500 then raise exception 'Photo review details required' using errcode='22023'; end if;
 previous:=value.state;
 if decision='approve' then
  image_bytes:=decode(publication->>'jpeg_base64','base64');
  if image_bytes is null or octet_length(image_bytes) not between 4 and 262144 or substring(image_bytes from 1 for 3)<>decode('ffd8ff','hex') then raise exception 'Bounded JPEG publication required' using errcode='22023'; end if;
  image_hash:=encode(sha256(image_bytes),'hex');
  if previous='approved' and exists(select 1 from public.public_player_photos where asset_id=asset and content_sha256=image_hash) then return; end if;
  if previous<>'pending_review' then raise exception 'Pending photo review required' using errcode='22023'; end if;
  if not exists(select 1 from storage.objects where bucket_id='player-private' and name=value.evidence_path) or not exists(select 1 from storage.objects where bucket_id='player-private' and name=value.photo_path) then raise exception 'Private originals and evidence required' using errcode='22023'; end if;
  with superseded as(update public.player_photo_assets set state='revoked',reviewed_by=auth.uid(),reviewed_at=now(),review_reason='Superseded by approved photo' where player_id=value.player_id and state='approved' returning id)
  insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state) select auth.uid(),'organizer','photo.superseded',id,'player_photo',jsonb_build_object('state','approved'),jsonb_build_object('state','revoked') from superseded;
  update public.player_photo_assets set state='approved',reviewed_by=auth.uid(),reviewed_at=now(),review_reason=btrim(reason) where id=asset;
  insert into public.public_player_photos(player_id,asset_id,content_base64,content_sha256) values(value.player_id,asset,encode(image_bytes,'base64'),image_hash) on conflict(player_id) do update set asset_id=excluded.asset_id,content_base64=excluded.content_base64,content_sha256=excluded.content_sha256,updated_at=now();
 else
  if (decision='reject' and previous='rejected') or (decision='revoke' and previous='revoked') then return; end if;
  if (decision='reject' and previous not in('pending_upload','pending_review')) or (decision='revoke' and previous<>'approved') then raise exception 'Invalid review transition' using errcode='22023'; end if;
  update public.player_photo_assets set state=case when decision='reject' then 'rejected'::public.photo_state else 'revoked'::public.photo_state end,reviewed_by=auth.uid(),reviewed_at=now(),review_reason=btrim(reason) where id=asset;
  delete from public.public_player_photos where asset_id=asset;
 end if;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state) values(auth.uid(),'organizer','photo.'||decision,asset,'player_photo',jsonb_build_object('state',previous),jsonb_build_object('decision',decision,'reason',btrim(reason),'content_sha256',image_hash));
end;
$$;
revoke all on function public.begin_player_photo(uuid,uuid,text,text,integer,integer,text,text,boolean),public.finish_player_photo(uuid),public.review_player_photo(uuid,text,text,jsonb) from public,anon;
grant execute on function public.begin_player_photo(uuid,uuid,text,text,integer,integer,text,text,boolean),public.finish_player_photo(uuid),public.review_player_photo(uuid,text,text,jsonb) to authenticated;
commit;
