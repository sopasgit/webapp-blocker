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
 * of type "app" or "popup" — which we CAN detect.
 * 
 * How it works:
 * 1. Monitors all new window creation via chrome.windows.onCreated
 * 2. When a window of type "app" or "popup" is detected, inspects its tabs
 * 3. Captures the URL from the app window
 * 4. Closes the app window
 * 5. Re-opens the URL in a normal filtered browser tab
 * 
 * This ensures all browsing goes through normal Chrome tabs where 
 * Linewize (or any extension-based filter) is active.
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

// ============================================================
// CORE LOGIC
// ============================================================

/**
 * Checks if a URL is in the allowlist.
 */
function isAllowedUrl(url) {
  if (!url) return false;
  return ALLOWED_APP_URLS.some((allowed) => url.startsWith(allowed));
}

/**
 * Handles a newly created window.
 * If it's an app window, closes it and reopens the URL in a normal tab.
 */
function handleNewWindow(window) {
  // Only target app-type windows (created by "Install Page as App")
  // We intentionally do NOT target "popup" windows, as those are used by
  // OAuth login flows, educational tools, and other legitimate browser features.
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

    // Check if this URL is allowlisted
    if (url && isAllowedUrl(url)) {
      console.log(
        `[WebAppBlocker] Allowed app window for: ${url}`
      );
      return;
    }

    // Close the app window
    chrome.windows.remove(window.id, () => {
      if (chrome.runtime.lastError) {
        console.warn(
          `[WebAppBlocker] Error closing window: ${chrome.runtime.lastError.message}`
        );
        return;
      }

      console.log(
        `[WebAppBlocker] Closed app window${url ? ` for: ${url}` : ""}`
      );

      // Re-open the URL in a normal browser tab (where filters are active)
      if (url && url !== "chrome://newtab/" && !url.startsWith("chrome://")) {
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
