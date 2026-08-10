-- Broadcast changes on these tables to subscribed clients (passenger
-- watching their ride/driver, driver watching the open request pool).
alter publication supabase_realtime add table public.rides;
alter publication supabase_realtime add table public.driver_status;
