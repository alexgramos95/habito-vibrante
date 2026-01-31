-- Fix: feedback_missing_policies - Add UPDATE and DELETE policies for feedback table
CREATE POLICY "Users can update their own feedback"
ON public.feedback
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback"
ON public.feedback
FOR DELETE
USING (auth.uid() = user_id);

-- Fix: client_profile_validation - Add database constraint for display_name length
ALTER TABLE public.profiles
ADD CONSTRAINT display_name_length CHECK (char_length(display_name) <= 100);