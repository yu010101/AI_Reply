-- アバター画像用のストレージバケットを作成
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- アバター画像のアップロードを許可するポリシーを作成
create policy "アバター画像のアップロードを許可"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- アバター画像の読み取りを許可するポリシーを作成
create policy "アバター画像の読み取りを許可"
on storage.objects for select
to authenticated
using (bucket_id = 'avatars');

-- アバター画像の更新を許可するポリシーを作成
create policy "アバター画像の更新を許可"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- アバター画像の削除を許可するポリシーを作成
create policy "アバター画像の削除を許可"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars' and
  auth.uid()::text = (storage.foldername(name))[1]
); 