import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  message: string;
  context?: string;
  email?: string;
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
    logStep("Request body parsed", { 
      hasMessage: !!body.message, 
      context: body.context,
      hasEmail: !!body.email 
    });

    // Get user info from auth if available
    let userEmail = body.email;
    let userId = body.userId;

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
        logStep("User authenticated", { email: userEmail, userId });
      }
    }

    // Build Slack message
    const timestamp = new Date().toISOString();
    const contextEmoji = body.context === "trial_ended" ? "⏰" : "💬";
    
    // Build simple text-based Slack message
    let slackText = `${contextEmoji} *New Feedback from becoMe*\n\n`;
    slackText += `*Email:* ${userEmail || "Anonymous"}\n`;
    slackText += `*Context:* ${body.context || "general"}\n`;
    slackText += `*Timestamp:* ${timestamp}\n`;

    if (body.willingnessToPay) {
      slackText += `*Willingness to Pay:* ${body.willingnessToPay}\n`;
    }

    if (body.howBecomeHelped || body.message) {
      slackText += `\n*How Become Helped:*\n${body.howBecomeHelped || body.message || "_No message_"}\n`;
    }

    if (body.whatWouldMakePay) {
      slackText += `\n*What Would Make Pay:*\n${body.whatWouldMakePay}\n`;
    }

    if (body.whatPreventsPay) {
      slackText += `\n*What Prevents Paying:*\n${body.whatPreventsPay}\n`;
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
        feedback_type: body.context || "general",
        willingness_to_pay: body.willingnessToPay || null,
        what_would_make_pay: body.whatWouldMakePay || null,
        what_prevents_pay: body.whatPreventsPay || null,
        how_become_helped: body.howBecomeHelped || body.message || null,
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
