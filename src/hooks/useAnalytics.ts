// Analytics tracking stubs for GTM/App events
// These are stubs - will be implemented with real analytics in production

export type AnalyticsEvent = 
  | 'onboarding_complete'
  | 'habit_created'
  | 'tracker_used'
  | 'calendar_open'
  | 'paywall_view'
  | 'upgrade_click'
  | 'trial_start'
  | 'trial_end'
  | 'screenshots_mode'
  | 'export_attempt'
  | 'page_view'
  | 'habit_completed'
  | 'tracker_entry'
  | 'shopping_item_added'
  | 'reflection_saved'
  | 'future_self_saved';

interface AnalyticsPayload {
  event: AnalyticsEvent;
  properties?: Record<string, any>;
  timestamp?: string;
}

const DEBUG = import.meta.env.DEV;

// Analytics queue for batching
const eventQueue: AnalyticsPayload[] = [];

export const track = (event: AnalyticsEvent, properties?: Record<string, any>) => {
  const payload: AnalyticsPayload = {
    event,
    properties,
    timestamp: new Date().toISOString(),
  };
  
  eventQueue.push(payload);
  
  if (DEBUG) {
    console.log('[Analytics]', event, properties);
  }
  
  // Stub: In production, this would send to analytics service
  // sendToAnalytics(payload);
};

export const identify = (userId: string, traits?: Record<string, any>) => {
  if (DEBUG) {
    console.log('[Analytics] Identify:', userId, traits);
  }
  // Stub: In production, this would identify user
};

export const page = (name: string, properties?: Record<string, any>) => {
  track('page_view', { page: name, ...properties });
};

// Trial funnel event stubs
export const trialEvents = {
  start: () => track('trial_start'),
  day2: () => track('trial_end', { day: 2, type: 'reminder' }),
  day4: () => track('trial_end', { day: 4, type: 'reminder' }),
  day6: () => track('trial_end', { day: 6, type: 'urgency' }),
  end: () => track('trial_end'),
  upgradeNudge: () => track('upgrade_click', { source: 'nudge' }),
  bounceback: () => track('upgrade_click', { source: 'bounceback' }),
};

// Funnel email/push copy stubs (EN-first)
export const funnelCopy = {
  trial_start: {
    subject: "Your 7-day trial starts now",
    body: "Track habits. See savings. Become who you're aiming to be.",
  },
  day2: {
    subject: "Day 2: Consistency builds momentum",
    body: "Check in today. Your streak depends on it.",
  },
  day4: {
    subject: "Day 4: You're building something",
    body: "Halfway through. Don't stop now.",
  },
  day6: {
    subject: "Day 6: One day left",
    body: "Your trial ends tomorrow. Lock in your progress.",
  },
  trial_end: {
    subject: "Trial ended. Stay consistent.",
    body: "Upgrade now to keep your data and continue tracking.",
  },
  upgrade_nudge: {
    subject: "Don't break your streak",
    body: "Consistency compounds. Upgrade to Pro.",
  },
  bounceback: {
    subject: "Come back stronger",
    body: "Your habits are waiting. Resume your journey.",
  },
};

export const useAnalytics = () => {
  return {
    track,
    identify,
    page,
    trialEvents,
  };
};
