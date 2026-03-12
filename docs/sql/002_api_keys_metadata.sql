alter table api_keys
  rename column user_id to owner_user_id;

alter table api_keys
  rename column role_code to role;

alter table api_keys
  add column if not exists partner_id text,
  add column if not exists environment text not null default 'live',
  add column if not exists notes text,
  add column if not exists is_active boolean not null default true;

update api_keys
set partner_id = coalesce(partner_id, key_prefix)
where partner_id is null;

alter table api_keys
  alter column partner_id set not null;

alter table api_keys
  alter column key_prefix set not null;

create unique index if not exists idx_api_keys_key_prefix on api_keys(key_prefix);
create index if not exists idx_api_keys_partner_id on api_keys(partner_id);
create index if not exists idx_api_keys_is_active on api_keys(is_active);
create index if not exists idx_api_keys_expires_at on api_keys(expires_at);
