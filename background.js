/**
 * Web App Install Blocker - Background Service Worker
 * 
 * Purpose: Prevents students from bypassing extension-based web filters
 * (e.g., Linewize) by using Chrome's "Install Page as App" feature.
 * 
 * Why this approach:
 * Modern "Install Page as App" creates Web Apps that are NOT part of 
 * Chrome's extension system. The chrome.management API cannot see or 
 * control them. However, when a web app launches, it opens in a window 
 * of type "app" — which we CAN detect.
 * 
 * How it works:
 * 1. Monitors all new window creation via chrome.windows.onCreated
 * 2. When a window of type "app" is detected, inspects its tabs
 * 3. Checks if the URL is a real web URL (not a ChromeOS native app)
 * 4. Closes the app window
 * 5. Re-opens the URL in a normal filtered browser tab
 * 
 * This ensures all browsing goes through normal Chrome tabs where 
 * Linewize (or any extension-based filter) is active, while leaving
 * ChromeOS native apps (Files, Camera, etc.) completely untouched.
 */

// ============================================================
// CONFIGURATION
// ============================================================

// URLs to NEVER redirect (allowlist).
// Add patterns here for any web apps you want students to use in app mode.
// Uses simple string matching — if the URL starts with any of these, it's allowed.
const ALLOWED_APP_URLS = [
  // "https://docs.google.com",
  // "https://meet.google.com",
];

// URL prefixes that indicate a ChromeOS native/system app window.
// These should NEVER be closed or redirected.
const NATIVE_APP_URL_PREFIXES = [
  "chrome://",
  "chrome-extension://",
  "chrome-untrusted://",
  "file://",
  "about:",
];

// ============================================================
// CORE LOGIC
// ============================================================

/**
 * Checks if a URL belongs to a ChromeOS native or system app.
 * Native apps (Files, Camera, Calculator, etc.) use chrome:// or
 * chrome-extension:// URLs — not real web URLs.
 */
function isNativeAppUrl(url) {
  if (!url) return true; // No URL = treat as native, don't touch it
  return NATIVE_APP_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/**
 * Checks if a URL is in the allowlist.
 */
function isAllowedUrl(url) {
  if (!url) return false;
  return ALLOWED_APP_URLS.some((allowed) => url.startsWith(allowed));
}

/**
 * Handles a newly created window.
 * If it's a web app window (not a native ChromeOS app), closes it
 * and reopens the URL in a normal filtered browser tab.
 */
function handleNewWindow(window) {
  // Only target app-type windows
  if (window.type !== "app") {
    return;
  }

  // Get the tabs in this window to find the URL
  chrome.tabs.query({ windowId: window.id }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.warn(
        `[WebAppBlocker] Error querying tabs: ${chrome.runtime.lastError.message}`
      );
      return;
    }

    // Get the URL from the first tab in the app window
    const tab = tabs && tabs[0];
    const url = tab ? tab.url || tab.pendingUrl : null;

    // *** KEY FIX ***
    // If the URL is a ChromeOS native app URL (chrome://, chrome-extension://, etc.)
    // leave it completely alone. This protects Files, Camera, Calculator, etc.
    if (isNativeAppUrl(url)) {
      console.log(
        `[WebAppBlocker] Skipping native ChromeOS app window${url ? ` (${url})` : " (no URL)"}`
      );
      return;
    }

    // Check if this URL is in the web app allowlist
    if (isAllowedUrl(url)) {
      console.log(
        `[WebAppBlocker] Allowed web app window for: ${url}`
      );
      return;
    }

    // This is a real web URL in an app window — close it and redirect to normal tab
    chrome.windows.remove(window.id, () => {
      if (chrome.runtime.lastError) {
        console.warn(
          `[WebAppBlocker] Error closing window: ${chrome.runtime.lastError.message}`
        );
        return;
      }

      console.log(
        `[WebAppBlocker] Closed web app window${url ? ` for: ${url}` : ""}`
      );

      // Re-open the URL in a normal browser tab (where filters are active)
      if (url) {
        chrome.tabs.create({ url: url }, () => {
          if (chrome.runtime.lastError) {
            console.warn(
              `[WebAppBlocker] Error creating tab: ${chrome.runtime.lastError.message}`
            );
          } else {
            console.log(
              `[WebAppBlocker] Redirected to filtered tab: ${url}`
            );
          }
        });
      }
    });
  });
}

// ============================================================
// WINDOW CREATION LISTENER
// Fires whenever any new Chrome window is opened.
// ============================================================
chrome.windows.onCreated.addListener((window) => {
  handleNewWindow(window);
});
