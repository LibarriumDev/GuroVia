"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ConsentChoice = "unknown" | "necessary-only" | "analytics-accepted";
type GtagArguments = [string, ...unknown[]];

declare global {
  interface Window {
    dataLayer?: GtagArguments[];
    gtag?: (...args: GtagArguments) => void;
    __guroviaAnalyticsInitialized?: boolean;
    __guroviaAnalyticsScriptRequested?: boolean;
  }
}

const rawMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";
const measurementId = /^G-[A-Z0-9]+$/i.test(rawMeasurementId) ? rawMeasurementId : "";
const CONSENT_STORAGE_KEY = "gurovia-cookie-consent-v1";
const LEGACY_STORAGE_KEY = "snhs-analytics-consent-v1";

function isPublicAnalyticsSurface(pathname: string) {
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (["/", "/contact", "/privacy", "/terms", "/agreement", "/cookies"].includes(normalized)) return true;
  return /^\/s\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/(?:privacy|terms|agreement|cookies))?$/i.test(normalized);
}

function tenantAwarePath(pathname: string, suffix: "privacy" | "cookies") {
  const match = pathname.match(/^\/s\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$)/i);
  return match ? `/s/${match[1]}/${suffix}` : `/${suffix}`;
}

function readChoice(): ConsentChoice {
  try {
    const saved = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { choice?: unknown };
        if (parsed.choice === "necessary-only" || parsed.choice === "analytics-accepted") return parsed.choice;
      } catch {
        if (saved === "necessary-only" || saved === "analytics-accepted") return saved;
        if (saved === "rejected") return "necessary-only";
        if (saved === "accepted") return "analytics-accepted";
      }
    }
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy === "rejected") return "necessary-only";
    if (legacy === "accepted") return "analytics-accepted";
  } catch {
    // Keep the notice open if browser storage is unavailable; the user's choice applies for this page session.
  }
  return "unknown";
}

function saveChoice(choice: Exclude<ConsentChoice, "unknown">) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ choice, version: "gurovia-cookies-2026-10-17-v1", updatedAt: new Date().toISOString() }));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // The React state still applies this choice to the current page session.
  }
}

function setGoogleConsent(analyticsAllowed: boolean) {
  if (!window.gtag) return;
  window.gtag("consent", "update", {
    analytics_storage: analyticsAllowed ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  });
}

export function AnalyticsConsent() {
  const pathname = usePathname() || "/";
  const [choice, setChoice] = useState<ConsentChoice>("unknown");
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const lastSentPageView = useRef("");
  const trackingPage = isPublicAnalyticsSurface(pathname);

  useEffect(() => { setChoice(readChoice()); }, []);

  const sendPublicPageView = useCallback((path: string) => {
    if (!window.gtag || !isPublicAnalyticsSurface(path)) return;
    // Analytics receives only the URL pathname, never query parameters or fragments.
    const safePath = path.split("?")[0].split("#")[0];
    if (lastSentPageView.current === safePath) return;
    lastSentPageView.current = safePath;
    window.gtag("event", "page_view", { page_path: safePath, page_title: document.title, page_location: window.location.origin + safePath });
  }, []);

  useEffect(() => {
    if (choice !== "analytics-accepted" || !measurementId || !trackingPage || preferencesOpen) {
      setGoogleConsent(false);
      return;
    }

    if (!window.__guroviaAnalyticsInitialized) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function (...args: GtagArguments) { window.dataLayer?.push(args); };
      window.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      window.gtag("js", new Date());
      window.gtag("config", measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
      window.__guroviaAnalyticsInitialized = true;
    }
    setGoogleConsent(true);

    if (!window.__guroviaAnalyticsScriptRequested) {
      window.__guroviaAnalyticsScriptRequested = true;
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      const nonceElement = document.querySelector<HTMLScriptElement>("script[nonce]");
      if (nonceElement?.nonce) script.nonce = nonceElement.nonce;
      script.onerror = () => { window.__guroviaAnalyticsScriptRequested = false; };
      document.head.appendChild(script);
    }
    sendPublicPageView(pathname);
  }, [choice, pathname, trackingPage, preferencesOpen, sendPublicPageView]);

  function choose(next: Exclude<ConsentChoice, "unknown">) {
    saveChoice(next);
    setChoice(next);
    setPreferencesOpen(false);
    if (next !== "analytics-accepted") setGoogleConsent(false);
  }

  function openChoices() {
    setGoogleConsent(false);
    setPreferencesOpen(true);
  }

  const cookieLink = tenantAwarePath(pathname, "cookies");
  const privacyLink = tenantAwarePath(pathname, "privacy");

  return (
    <>
      {choice === "unknown" && !preferencesOpen && (
        <aside className="gurovia-cookie-banner" role="region" aria-label="Cookie and data collection preferences">
          <div className="gurovia-cookie-copy">
            <strong>Privacy & cookie choices</strong>
            <p>GuroVia uses necessary storage for sign-in, security, and your preferences. Optional analytics is used only on public pages if you accept it; it is not used to track grade or teacher pages. Read the <Link href={privacyLink}>Privacy Policy</Link> and <Link href={cookieLink}>Cookie Policy</Link>.</p>
            {!measurementId && <small>Optional analytics is not configured for this deployment.</small>}
          </div>
          <div className="gurovia-cookie-actions">
            <button type="button" className="gurovia-cookie-necessary" onClick={() => choose("necessary-only")}>Essential only</button>
            {measurementId && <button type="button" className="gurovia-cookie-accept" onClick={() => choose("analytics-accepted")}>Accept analytics</button>}
          </div>
        </aside>
      )}
      {choice !== "unknown" && <button type="button" className="gurovia-cookie-settings" onClick={openChoices}>Cookie settings</button>}
      {preferencesOpen && (
        <aside className="gurovia-cookie-banner gurovia-cookie-banner-compact" role="dialog" aria-modal="false" aria-label="Cookie settings">
          <div className="gurovia-cookie-copy"><strong>Cookie settings</strong><p>Necessary storage stays on for sign-in and security. Optional analytics is currently {choice === "analytics-accepted" ? "enabled on eligible public pages" : "off"}. Change your choice below.</p><Link href={cookieLink}>Read the Cookie Policy</Link></div>
          <div className="gurovia-cookie-actions"><button type="button" className="gurovia-cookie-necessary" onClick={() => choose("necessary-only")}>Essential only</button>{measurementId && <button type="button" className="gurovia-cookie-accept" onClick={() => choose("analytics-accepted")}>Accept analytics</button>}<button type="button" className="gurovia-cookie-necessary" onClick={() => setPreferencesOpen(false)}>Close</button></div>
        </aside>
      )}
    </>
  );
}
