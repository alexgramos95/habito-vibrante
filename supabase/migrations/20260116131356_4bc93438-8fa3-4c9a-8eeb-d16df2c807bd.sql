-- Add UNIQUE constraint on user_id in subscriptions table
-- This is required for upsert operations to work correctly
ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);