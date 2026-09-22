import { Capacitor } from "@capacitor/core";
import type { PlanType } from "@/config/billing";

// Public RevenueCat Android SDK key (safe to ship in the app).
export const REVENUECAT_ANDROID_KEY = "goog_REPLACE_WITH_YOUR_PUBLIC_KEY";

export const isNativeAndroid = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

let configured = false;

const getPurchases = async () => {
  const mod = await import("@revenuecat/purchases-capacitor");
  return mod.Purchases;
};

export async function initBilling(userId: string) {
  if (!isNativeAndroid()) return;
  const Purchases = await getPurchases();
  if (!configured) {
    await Purchases.configure({ apiKey: REVENUECAT_ANDROID_KEY, appUserID: userId });
    configured = true;
  } else {
    await Purchases.logIn({ appUserID: userId });
  }
}

export async function logoutBilling() {
  if (!isNativeAndroid() || !configured) return;
  try {
    const Purchases = await getPurchases();
    await Purchases.logOut();
  } catch {
    /* anonymous user already */
  }
}

const PACKAGE_MATCH: Record<PlanType, string[]> = {
  monthly: ["$rc_monthly", "monthly"],
  yearly: ["$rc_annual", "annual", "yearly"],
  lifetime: ["$rc_lifetime", "lifetime"],
};

/** Returns true when the purchase unlocked the "pro" entitlement. */
export async function purchasePlan(plan: PlanType): Promise<boolean> {
  if (!isNativeAndroid()) throw new Error("NOT_ANDROID");
  const Purchases = await getPurchases();
  const offerings = await Purchases.getOfferings();
  const pkgs = offerings.current?.availablePackages ?? [];
  const pkg = pkgs.find((p) => PACKAGE_MATCH[plan].includes(p.identifier));
  if (!pkg) throw new Error("PACKAGE_NOT_FOUND");
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return !!customerInfo.entitlements.active["pro"];
}

export async function restoreBilling(): Promise<boolean> {
  if (!isNativeAndroid()) throw new Error("NOT_ANDROID");
  const Purchases = await getPurchases();
  const { customerInfo } = await Purchases.restorePurchases();
  return !!customerInfo.entitlements.active["pro"];
}

export function openManageSubscriptions() {
  window.open("https://play.google.com/store/account/subscriptions?package=app.lovable.becomeme", "_blank");
}
