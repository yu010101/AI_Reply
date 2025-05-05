-- ユーザーロールテーブルを作成
create table user_roles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, tenant_id)
);

-- インデックスを作成
create index user_roles_user_id_idx on user_roles(user_id);
create index user_roles_tenant_id_idx on user_roles(tenant_id);

-- 更新日時を自動更新するトリガーを作成
create trigger set_updated_at
  before update on user_roles
  for each row
  execute function set_updated_at();

-- ポリシーを作成
alter table user_roles enable row level security;

-- テナントのオーナーはすべての権限を持つ
create policy "テナントのオーナーはすべての権限を持つ"
  on user_roles
  for all
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and tenant_id = user_roles.tenant_id
      and role = 'owner'
    )
  );

-- テナントの管理者は参照と更新が可能
create policy "テナントの管理者は参照と更新が可能"
  on user_roles
  for select
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and tenant_id = user_roles.tenant_id
      and role in ('owner', 'admin')
    )
  );

-- 初期データを挿入（既存のテナントのオーナーとして）
insert into user_roles (user_id, tenant_id, role)
select 
  t.created_by,
  t.id,
  'owner'
from tenants t
where not exists (
  select 1 from user_roles ur
  where ur.tenant_id = t.id
  and ur.user_id = t.created_by
); 