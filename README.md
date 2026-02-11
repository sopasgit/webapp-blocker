# Web App Install Blocker — Chrome Extension

A lightweight, zero-maintenance Chrome extension for school IT administrators. Prevents students from bypassing extension-based web filters (e.g., Linewize, GoGuardian, Securly) by using Chrome's **"Install Page as App"** feature.

## The Problem

Chrome's **3-dot menu → Cast, Save and Share → Install Page as App** creates a standalone app window that may not load extension-based web filters. Students exploit this to access blocked content.

## How This Extension Works

- **Real-time only** — Listens for the `chrome.management.onInstalled` event and immediately removes any newly installed web app.
- **Zero maintenance** — No configuration files, no allowlists to manage, no periodic scans.
- **Safe for existing apps** — Does NOT scan or remove apps already on student devices. Only catches new installs going forward.
- **Admin-safe** — Apps force-installed via Google Admin Console are never touched.
- **Minimal footprint** — The service worker is completely dormant until a web app install event fires. No polling, no timers, no content scripts.

## Files

```
webapp-blocker/
├── manifest.json      # Extension manifest (Manifest V3)
├── background.js      # Real-time detection and removal logic
├── update.xml         # Update manifest for self-hosted deployment
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## Self-Hosting on GitHub

### Step 1: Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in.
2. Click **New repository**.
3. Name it `webapp-blocker`.
4. Set it to **Public** (Chrome needs to access the update manifest without authentication).
5. Click **Create repository**.

### Step 2: Upload the Extension Files

Upload all files to the root of the repo so the structure looks like:

```
webapp-blocker/            (repository root)
├── manifest.json
├── background.js
├── update.xml
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Step 3: Get Your Extension ID

1. On any computer with Chrome, go to `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top right).
3. Click **Load unpacked** and select your `webapp-blocker` folder.
4. The extension will load. Copy the **Extension ID** (a 32-character string like `abcdefghijklmnopqrstuvwxyzabcdef`).

### Step 4: Pack the Extension

1. Still on `chrome://extensions`, click **Pack extension**.
2. For "Extension root directory", browse to your `webapp-blocker` folder.
3. Leave "Private key file" blank for the first time.
4. Chrome will generate two files:
   - `webapp-blocker.crx` — the packaged extension
   - `webapp-blocker.pem` — your private key (**save this securely**, you need it for future updates)

### Step 5: Update update.xml

Open `update.xml` and replace the placeholder values:

```xml
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='YOUR_EXTENSION_ID_HERE'>
    <updatecheck codebase='https://github.com/YOUR_USERNAME/webapp-blocker/releases/download/v1.0.0/webapp-blocker.crx' version='1.0.0' />
  </app>
</gupdate>
```

- Replace `YOUR_EXTENSION_ID_HERE` with the ID from Step 3.
- Replace `YOUR_USERNAME` with your GitHub username.
- Commit this change to your repo.

### Step 6: Create a GitHub Release

1. In your GitHub repo, go to **Releases** → **Create a new release**.
2. Set the tag to `v1.0.0`.
3. Title it `v1.0.0 - Initial Release`.
4. Attach the `webapp-blocker.crx` file from Step 4.
5. Click **Publish release**.

### Step 7: Force-Install via Google Admin Console

1. Sign in to [admin.google.com](https://admin.google.com).
2. Navigate to **Devices → Chrome → Apps & extensions → Users & browsers**.
3. Select the **Organizational Unit** containing your students.
4. Click the **+** button → **Add Chrome app or extension by ID**.
5. Enter the **Extension ID** from Step 3.
6. For the **Update URL**, enter:
   ```
   https://raw.githubusercontent.com/YOUR_USERNAME/webapp-blocker/main/update.xml
   ```
7. Set the **Installation policy** to **Force install**.
8. Click **Save**.

### Step 8: Verify Deployment

On a student Chromebook:

1. Go to `chrome://extensions` — the extension should appear and show as installed by policy (students cannot disable or remove it).
2. Go to `chrome://policy` → Click **Reload policies** → Verify the extension appears.
3. **Test it**: Use **3-dot menu → Cast, Save and Share → Install Page as App** on any website. The app should be immediately removed after install.

---

## Updating the Extension (Future)

1. Edit your code and increment `"version"` in `manifest.json` (e.g., `"1.0.1"`).
2. Re-pack using the **same .pem file** from Step 4.
3. Create a new GitHub release and upload the new `.crx`.
4. Update `update.xml` with the new version and release URL.
5. Commit and push. Chrome will auto-update on student devices.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Extension doesn't appear on devices | Wait 10-15 minutes for policy propagation, or force refresh: `chrome://policy` → Reload policies |
| "Install Page as App" still works | Check `chrome://extensions` to confirm the extension is active. Inspect the service worker console for logs. |
| GitHub raw URL not working | Make sure the repo is **Public** |
| Students' existing allowed apps disappeared | This should not happen — the extension only catches new installs, not existing apps. If it does, check that those apps have `installType: "admin"`. |

---

## Important Notes

- This extension **does not replace your web filter**. It closes one specific bypass method.
- Continue to work with your filter vendor (e.g., Linewize) to fix their extension behavior in app windows.
- The `management` API cannot remove force-installed apps, so admin-deployed apps are always safe.
