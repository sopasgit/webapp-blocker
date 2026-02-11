/**
 * Web App Install Blocker - Background Service Worker
 * 
 * Purpose: Prevents students from bypassing extension-based web filters
 * (e.g., Linewize) by using Chrome's "Install Page as App" feature.
 * 
 * How it works:
 * - Listens for real-time app installation events via chrome.management.onInstalled
 * - When a new app is detected, checks if it's a web app (hosted_app or legacy_packaged_app)
 * - If it is, immediately and silently uninstalls it
 * 
 * What it does NOT do:
 * - Does NOT scan or remove previously installed apps
 * - Does NOT touch admin force-installed apps
 * - Does NOT interfere with allowlisted apps already on student devices
 * 
 * This is a zero-maintenance, event-only extension.
 */

// ============================================================
// CONFIGURATION
// ============================================================

// App types that should be removed when installed by a user.
// "hosted_app" = web apps installed via "Install Page as App"
// "legacy_packaged_app" = older Chrome packaged apps
const BLOCKED_APP_TYPES = ["hosted_app", "legacy_packaged_app"];

// ============================================================
// CORE LOGIC
// ============================================================

/**
 * Determines whether a newly installed app should be removed.
 */
function shouldRemove(extensionInfo) {
  // Only target web app types
  if (!BLOCKED_APP_TYPES.includes(extensionInfo.type)) {
    return false;
  }

  // Don't attempt to remove admin-forced installs
  if (extensionInfo.installType === "admin") {
    return false;
  }

  return true;
}

/**
 * Silently uninstalls a given app by ID.
 */
function removeApp(extensionInfo) {
  chrome.management.uninstall(extensionInfo.id, { showConfirmDialog: false }, () => {
    if (chrome.runtime.lastError) {
      console.warn(
        `[WebAppBlocker] Could not remove "${extensionInfo.name}" (${extensionInfo.id}): ${chrome.runtime.lastError.message}`
      );
    } else {
      console.log(
        `[WebAppBlocker] Removed web app: "${extensionInfo.name}" (${extensionInfo.id})`
      );
    }
  });
}

// ============================================================
// REAL-TIME LISTENER
// Fires only when a new app or extension is installed.
// Completely dormant otherwise — no polling, no sweeps.
// ============================================================

chrome.management.onInstalled.addListener((extensionInfo) => {
  if (shouldRemove(extensionInfo)) {
    console.log(
      `[WebAppBlocker] Blocked web app install: "${extensionInfo.name}" (${extensionInfo.id}). Removing...`
    );
    removeApp(extensionInfo);
  }
});
