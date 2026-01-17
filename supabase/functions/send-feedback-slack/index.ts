import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  // Snake_case fields from FeedbackFormModal
  user_id?: string;
  email?: string;
  feedback_type?: string;
  willingness_to_pay?: string;
  what_would_make_pay?: string;
  what_prevents_pay?: string;
  how_become_helped?: string;
  additional_notes?: string;
  // Legacy camelCase fields for backwards compatibility
  message?: string;
  context?: string;
  userId?: string;
  willingnessToPay?: string;
  whatWouldMakePay?: string;
  whatPreventsPay?: string;
  howBecomeHelped?: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[FEEDBACK-SLACK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    if (!slackWebhookUrl) {
      throw new Error("SLACK_WEBHOOK_URL is not set");
    }
    logStep("Slack webhook URL verified");

    // Parse request body
    const body: FeedbackRequest = await req.json();
    
    // Normalize fields: support both snake_case (new) and camelCase (legacy)
    const feedbackType = body.feedback_type || body.context || "general";
    const willingnessToPay = body.willingness_to_pay || body.willingnessToPay || null;
    const whatWouldMakePay = body.what_would_make_pay || body.whatWouldMakePay || null;
    const whatPreventsPay = body.what_prevents_pay || body.whatPreventsPay || null;
    const howBecomeHelped = body.how_become_helped || body.howBecomeHelped || body.message || null;
    const additionalNotes = body.additional_notes || null;
    
    logStep("Request body parsed", { 
      feedbackType,
      hasWillingnessToPay: !!willingnessToPay,
      hasWhatWouldMakePay: !!whatWouldMakePay,
      hasWhatPreventsPay: !!whatPreventsPay,
      hasHowBecomeHelped: !!howBecomeHelped,
      hasEmail: !!body.email 
    });

    // Get user info from auth if available
    let userEmail = body.email;
    let userId = body.user_id || body.userId;

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      
      if (userData?.user) {
        userEmail = userData.user.email || userEmail;
        userId = userData.user.id || userId;
        logStep("User authenticated", { email: userEmail, id: userId });
      }
    }

    // Build Slack message
    const timestamp = new Date().toISOString();
    const contextEmoji = feedbackType === "trial_expiry" || feedbackType === "trial_ended" ? "⏰" : "💬";
    
    // Build simple text-based Slack message
    let slackText = `${contextEmoji} *New Feedback from becoMe*\n\n`;
    slackText += `*Email:* ${userEmail || "Anonymous"}\n`;
    slackText += `*Context:* ${feedbackType}\n`;
    slackText += `*Timestamp:* ${timestamp}\n`;

    if (willingnessToPay) {
      slackText += `*Willingness to Pay:* ${willingnessToPay}\n`;
    }

    if (howBecomeHelped) {
      slackText += `\n*How Become Helped:*\n${howBecomeHelped}\n`;
    }

    if (whatWouldMakePay) {
      slackText += `\n*What Would Make Pay:*\n${whatWouldMakePay}\n`;
    }

    if (whatPreventsPay) {
      slackText += `\n*What Prevents Paying:*\n${whatPreventsPay}\n`;
    }

    if (additionalNotes) {
      slackText += `\n*Additional Notes:*\n${additionalNotes}\n`;
    }

    // Send to Slack
    const slackResponse = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: slackText,
      }),
    });

    if (!slackResponse.ok) {
      const slackError = await slackResponse.text();
      logStep("Slack error", { status: slackResponse.status, error: slackError });
      throw new Error(`Slack webhook failed: ${slackError}`);
    }

    logStep("Slack notification sent successfully");

    // Also save to database if user is authenticated
    if (userId) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const { error: dbError } = await supabaseAdmin.from("feedback").insert({
        user_id: userId,
        feedback_type: feedbackType,
        willingness_to_pay: willingnessToPay,
        what_would_make_pay: whatWouldMakePay,
        what_prevents_pay: whatPreventsPay,
        how_become_helped: howBecomeHelped,
        additional_notes: additionalNotes,
      });

      if (dbError) {
        logStep("DB insert error (non-fatal)", { error: dbError.message });
      } else {
        logStep("Feedback saved to database");
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: rawMessage });
    
    return new Response(JSON.stringify({ error: "Failed to send feedback" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
