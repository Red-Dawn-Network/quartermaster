# Quartermaster Usage Guide

Quartermaster is a lightweight, browser‑based tool for organizing Arma Reforger workshop mods across multiple servers. It runs entirely in the browser and stores everything in localStorage, so no backend or database is required.

---

## 1. Getting Started

### Serve the Files

Use any static‑file server from the project root:

```bash
python3 -m http.server 8080
```

### Open in a Browser

* **Viewer:** [http://localhost:8080/index.html](http://localhost:8080/index.html)
* **Admin (password required):** [http://localhost:8080/admin.html](http://localhost:8080/admin.html)

### Set Title/Password

Edit `config.js` before serving:

```javascript
window.RDQM_CONFIG = {
  title: 'Red Dawn Quartermaster',
  adminPassword: 'your-secret'
};
```

---

## 2. Viewer Mode (`index.html`)

* Displays the current server’s mod list (Name/ID/Size).
* Switch servers via the toolbar dropdown.
* Sort mods by **Name** or **Size** via column headers.
* Export a formatted text list using the **Mod List** button (optional ID/size columns).
* Clicking **Admin** prompts for a password before redirecting to the admin page.

---

## 3. Admin Mode (`admin.html`)

### Authentication

* First visit requires the password from `config.js`.
* Successful login stores a flag in localStorage.
* **Logout** clears this flag.

### Managing Mods

* **Add:** Enter Name, 16‑character ID, and optional size (KB/MB/GB).
* **Edit/Delete:** Use the action buttons next to each entry.
* **Clear All:** Prompts a confirmation before wiping the active server’s mod list.
* **Mod List:** Export mods with a copy‑to‑clipboard option.

### Managing Servers

* **Add Server:** Create a new server with its own mod list.
* **Rename/Delete:** Change or remove the current server (at least one must always exist).
* **Color Dot:** Cycle through preset colors to visually distinguish servers.
* **Dropdown:** Server selection applies to both viewer and admin pages.

### Miscellaneous

* Light/Dark **theme toggle**, saved per browser.
* Sorting preferences are remembered.

---

## 4. Data Storage & Sync

* All data (servers, mods, theme, sort order, auth flag) is stored in `localStorage`.
* Clearing browser storage or using a new browser/device resets everything.
* Multi‑tab sync: Changes propagate across tabs via storage events.

---

## 5. Security Notes

* Password protection is client‑side only – suitable for trusted environments.
* For **public deployments**, use a proper authentication layer or host privately.

---