-- ============================================
-- 1. ROLE SYSTEM (separate table, no recursion)
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Users can see their own roles; admins see all
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- One-time bootstrap: first user can claim admin if no admin exists
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_has_admin boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO v_has_admin;
  IF v_has_admin THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

-- ============================================
-- 2. ANALYTICS EVENTS
-- ============================================
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  event_name text NOT NULL,
  event_props jsonb NOT NULL DEFAULT '{}'::jsonb,
  app_platform text,
  app_locale text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_user_created ON public.analytics_events (user_id, created_at DESC);
CREATE INDEX idx_analytics_events_name_created ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX idx_analytics_events_created ON public.analytics_events (created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own events (or anonymous if user_id is null and same session)
CREATE POLICY "Users can insert their own events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id IS NULL));

-- Only admins can read events
CREATE POLICY "Admins can view all events"
  ON public.analytics_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 3. REVENUE EVENTS (written by stripe-webhook, service role)
-- ============================================
CREATE TABLE public.revenue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  stripe_customer_id text,
  stripe_event_id text UNIQUE,
  event_type text NOT NULL, -- subscription_created | subscription_updated | subscription_cancelled | payment_succeeded | payment_failed | refund
  plan text,                 -- monthly | yearly | lifetime
  amount_cents integer,
  currency text DEFAULT 'eur',
  status text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_revenue_events_user ON public.revenue_events (user_id, occurred_at DESC);
CREATE INDEX idx_revenue_events_type ON public.revenue_events (event_type, occurred_at DESC);
CREATE INDEX idx_revenue_events_occurred ON public.revenue_events (occurred_at DESC);

ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read; inserts only happen via service_role (bypasses RLS), so no INSERT policy needed
CREATE POLICY "Admins can view all revenue events"
  ON public.revenue_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 4. AGGREGATED VIEWS FOR DASHBOARD
-- ============================================

-- Daily counts per event name (last 90 days)
CREATE OR REPLACE VIEW public.funnel_daily AS
SELECT
  date_trunc('day', created_at)::date AS day,
  event_name,
  count(*)::int AS event_count,
  count(DISTINCT user_id)::int AS unique_users
FROM public.analytics_events
WHERE created_at >= now() - interval '90 days'
GROUP BY 1, 2;

-- Daily revenue summary
CREATE OR REPLACE VIEW public.revenue_daily AS
SELECT
  date_trunc('day', occurred_at)::date AS day,
  event_type,
  plan,
  count(*)::int AS event_count,
  coalesce(sum(amount_cents), 0)::bigint AS amount_cents_sum
FROM public.revenue_events
WHERE occurred_at >= now() - interval '180 days'
GROUP BY 1, 2, 3;

-- Cohort retention (active users per signup-cohort week × week-since-signup)
CREATE OR REPLACE VIEW public.cohort_retention_weekly AS
WITH cohorts AS (
  SELECT
    user_id,
    date_trunc('week', min(created_at))::date AS cohort_week
  FROM public.analytics_events
  WHERE event_name = 'signup'
  GROUP BY user_id
),
activity AS (
  SELECT
    e.user_id,
    date_trunc('week', e.created_at)::date AS active_week
  FROM public.analytics_events e
  WHERE e.event_name = 'app_open'
  GROUP BY e.user_id, date_trunc('week', e.created_at)
)
SELECT
  c.cohort_week,
  ((a.active_week - c.cohort_week) / 7)::int AS week_offset,
  count(DISTINCT a.user_id)::int AS active_users
FROM cohorts c
JOIN activity a ON a.user_id = c.user_id AND a.active_week >= c.cohort_week
GROUP BY 1, 2;

-- Lock down view access via underlying RLS (security_invoker keeps caller's perms)
ALTER VIEW public.funnel_daily SET (security_invoker = true);
ALTER VIEW public.revenue_daily SET (security_invoker = true);
ALTER VIEW public.cohort_retention_weekly SET (security_invoker = true);