-- Personal watchlists for authenticated COMMON members.
-- No actual holdings, positions, or deposits are represented.
create table if not exists public.watchlist_items (
 user_id uuid not null references public.profiles(id) on delete cascade,
 symbol text not null check(symbol ~ '^[A-Z][A-Z0-9.-]{0,11}$'),
 created_at timestamptz not null default now(),
 primary key(user_id,symbol)
);
alter table public.watchlist_items enable row level security;
create policy "read own tracked symbols" on public.watchlist_items for select to authenticated
 using(user_id=(select auth.uid()));
create policy "add own tracked symbols" on public.watchlist_items for insert to authenticated
 with check(user_id=(select auth.uid()));
create policy "remove own tracked symbols" on public.watchlist_items for delete to authenticated
 using(user_id=(select auth.uid()));
-- Existing community owner is automatically joined by an INSERT trigger.
-- No crypto custody, account balances or executable orders exist in this database.
