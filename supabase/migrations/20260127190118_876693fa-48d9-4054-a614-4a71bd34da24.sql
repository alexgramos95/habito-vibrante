-- Add daily_logs column to user_data table for storing habit completion records
ALTER TABLE public.user_data ADD COLUMN daily_logs jsonb DEFAULT '[]'::jsonb;