begin;
-- Two 2 MiB files plus multipart overhead fit the server-mediated hosting path.
alter table public.player_photo_assets drop constraint player_photo_assets_photo_size_check;
alter table public.player_photo_assets drop constraint player_photo_assets_evidence_size_check;
alter table public.player_photo_assets add constraint player_photo_assets_photo_size_check check(photo_size between 1 and 2097152);
alter table public.player_photo_assets add constraint player_photo_assets_evidence_size_check check(evidence_size between 1 and 2097152);
update storage.buckets set file_size_limit=2097152 where id='player-private';
commit;
