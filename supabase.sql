-- Run once in Supabase SQL Editor. This is a fresh project setup.
create table if not exists public.pingu_votes (
  voter_token uuid primary key,
  item_id integer not null check (item_id between 1 and 3),
  created_at timestamptz not null default now()
);
alter table public.pingu_votes enable row level security;
revoke all on table public.pingu_votes from public, anon, authenticated;

create or replace function public.cast_vote(p_item_id integer, p_voter_token uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_item_id is null or p_item_id not between 1 and 3 then
    raise exception 'invalid_item';
  end if;
  insert into public.pingu_votes(voter_token,item_id) values(p_voter_token,p_item_id);
exception when unique_violation then
  raise exception 'already_voted';
end;
$$;

create or replace function public.get_vote_counts()
returns table(item_id integer, vote_count bigint)
language sql stable security definer set search_path = '' as $$
  select options.id, count(v.voter_token)::bigint
  from (values (1),(2),(3)) as options(id)
  left join public.pingu_votes v on v.item_id = options.id
  group by options.id order by options.id;
$$;
revoke all on function public.cast_vote(integer,uuid) from public;
revoke all on function public.get_vote_counts() from public;
grant execute on function public.cast_vote(integer,uuid) to anon,authenticated;
grant execute on function public.get_vote_counts() to anon,authenticated;
-- SQL Editor admin report:
-- select item_id, count(*) as votes from public.pingu_votes group by item_id order by item_id;
