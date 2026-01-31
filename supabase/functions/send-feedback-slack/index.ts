import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackContext {
  userId?: string;
  email?: string;
  tier?: string;
  trialDaysRemaining?: number;
  route?: string;
  habitCount?: number;
  trackerCount?: number;
  device?: string;
  browser?: string;
  platform?: string;
  screenSize?: string;
  appVersion?: string;
  locale?: string;
}

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
  // Rich context
  context?: FeedbackContext;
  // Legacy camelCase fields for backwards compatibility
  message?: string;
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
    const feedbackType = body.feedback_type || "general";
    const willingnessToPay = body.willingness_to_pay || body.willingnessToPay || null;
    const whatWouldMakePay = body.what_would_make_pay || body.whatWouldMakePay || null;
    const whatPreventsPay = body.what_prevents_pay || body.whatPreventsPay || null;
    const howBecomeHelped = body.how_become_helped || body.howBecomeHelped || body.message || null;
    const additionalNotes = body.additional_notes || null;
    const richContext = body.context || null;
    
    logStep("Request body parsed", { 
      feedbackType,
      hasWillingnessToPay: !!willingnessToPay,
      hasRichContext: !!richContext,
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

    // Determine tag based on feedback type
    const typeTagMap: Record<string, string> = {
      bug: "[BUG]",
      idea: "[IDEIA]",
      friction: "[FRICÇÃO]",
      trial_expiry: "[TRIAL]",
      trial_ended: "[TRIAL]",
      gating: "[GATING]",
      paywall: "[PAYWALL]",
      general: "[FEEDBACK]",
    };
    const tag = typeTagMap[feedbackType] || "[FEEDBACK]";

    // Build Slack message with rich context
    const timestamp = new Date().toISOString();
    
    let slackText = `${tag} *becoMe Feedback*\n\n`;
    slackText += `*Email:* ${userEmail || "Anonymous"}\n`;
    slackText += `*Timestamp:* ${timestamp}\n`;

    // Add rich context if available
    if (richContext) {
      slackText += `\n--- *Context* ---\n`;
      slackText += `*Tier:* ${(richContext.tier || "unknown").toUpperCase()}`;
      if (richContext.trialDaysRemaining && richContext.trialDaysRemaining > 0) {
        slackText += ` (${richContext.trialDaysRemaining}d left)`;
      }
      slackText += `\n`;
      slackText += `*Route:* ${richContext.route || "unknown"}\n`;
      slackText += `*Habits/Trackers:* ${richContext.habitCount || 0}/${richContext.trackerCount || 0}\n`;
      slackText += `*Device:* ${richContext.device || "?"} • ${richContext.browser || "?"} • ${richContext.platform || "?"} • ${richContext.screenSize || "?"}\n`;
      slackText += `*Version:* v${richContext.appVersion || "?"}\n`;
    }

    // Add feedback content
    slackText += `\n--- *Feedback* ---\n`;

    if (willingnessToPay) {
      slackText += `*Willingness to Pay:* ${willingnessToPay}\n`;
    }

    if (howBecomeHelped) {
      slackText += `*Como becoMe ajudou:*\n${howBecomeHelped}\n`;
    }

    if (whatWouldMakePay) {
      slackText += `*O que faria pagar:*\n${whatWouldMakePay}\n`;
    }

    if (whatPreventsPay) {
      slackText += `*O que impede de pagar:*\n${whatPreventsPay}\n`;
    }

    if (additionalNotes) {
      slackText += `*Notas adicionais:*\n${additionalNotes}\n`;
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
