-- Create feedback table for trial expiry feedback
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL DEFAULT 'trial_expiry',
  willingness_to_pay TEXT,
  what_would_make_pay TEXT,
  what_prevents_pay TEXT,
  how_become_helped TEXT,
  additional_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pro_interest table for tracking upgrade intent
CREATE TABLE public.pro_interest (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_interested TEXT NOT NULL,
  source TEXT DEFAULT 'decision_screen',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Policies for feedback table
CREATE POLICY "Users can view their own feedback" 
ON public.feedback 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback" 
ON public.feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Enable RLS on pro_interest
ALTER TABLE public.pro_interest ENABLE ROW LEVEL SECURITY;

-- Policies for pro_interest table
CREATE POLICY "Users can view their own interest" 
ON public.pro_interest 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interest" 
ON public.pro_interest 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);