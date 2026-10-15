-- Run once in the same Supabase project as schema.sql before enabling original-file sync.
-- The browser never receives a service-role key; authenticated access stays in the owner's folder.
insert into storage.buckets (id, name, public, file_size_limit)
values ('edu-study-originals', 'edu-study-originals', false, 12582912)
on conflict (id) do update set public = false, file_size_limit = 12582912;

drop policy if exists "Study originals insert own folder" on storage.objects;
drop policy if exists "Study originals read own folder" on storage.objects;
drop policy if exists "Study originals delete own folder" on storage.objects;

create policy "Study originals insert own folder"
on storage.objects for insert to authenticated
with check (bucket_id = 'edu-study-originals' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Study originals read own folder"
on storage.objects for select to authenticated
using (bucket_id = 'edu-study-originals' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Study originals delete own folder"
on storage.objects for delete to authenticated
using (bucket_id = 'edu-study-originals' and (storage.foldername(name))[1] = (select auth.uid()::text));
