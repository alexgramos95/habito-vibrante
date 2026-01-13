-- Add DELETE policies for GDPR compliance - allow users to delete their own data

CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscription" 
ON public.subscriptions 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own data" 
ON public.user_data 
FOR DELETE 
USING (auth.uid() = user_id);