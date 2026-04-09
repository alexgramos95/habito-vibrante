
-- Remove dangerous policies that allow users to modify their own subscription
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;

-- Keep only the SELECT policy so users can read their own subscription
-- All writes to subscriptions must go through edge functions using service_role
