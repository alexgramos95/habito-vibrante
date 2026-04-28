CREATE UNIQUE INDEX IF NOT EXISTS revenue_events_stripe_event_id_uniq ON public.revenue_events (stripe_event_id) WHERE stripe_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_event_name_created_idx ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_user_created_idx ON public.analytics_events (user_id, created_at DESC);