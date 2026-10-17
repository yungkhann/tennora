begin;
-- Store canonical base64 without PostgreSQL line wrapping at the 256 KiB boundary.
create or replace function public.review_player_photo(asset uuid,decision text,reason text,publication jsonb default null)
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
  insert into public.public_player_photos(player_id,asset_id,content_base64,content_sha256) values(value.player_id,asset,replace(encode(image_bytes,'base64'),chr(10),''),image_hash) on conflict(player_id) do update set asset_id=excluded.asset_id,content_base64=excluded.content_base64,content_sha256=excluded.content_sha256,updated_at=now();
 else
  if (decision='reject' and previous='rejected') or (decision='revoke' and previous='revoked') then return; end if;
  if (decision='reject' and previous not in('pending_upload','pending_review')) or (decision='revoke' and previous<>'approved') then raise exception 'Invalid review transition' using errcode='22023'; end if;
  update public.player_photo_assets set state=case when decision='reject' then 'rejected'::public.photo_state else 'revoked'::public.photo_state end,reviewed_by=auth.uid(),reviewed_at=now(),review_reason=btrim(reason) where id=asset;
  delete from public.public_player_photos where asset_id=asset;
 end if;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state) values(auth.uid(),'organizer','photo.'||decision,asset,'player_photo',jsonb_build_object('state',previous),jsonb_build_object('decision',decision,'reason',btrim(reason),'content_sha256',image_hash));
end;
$$;
commit;
