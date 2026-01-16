-- Drop the existing check constraint and add a new one with trial statuses
ALTER TABLE public.subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_status_check 
CHECK (status = ANY (ARRAY['active', 'cancelled', 'expired', 'past_due', 'trialing', 'trial_active', 'trial_expired']));