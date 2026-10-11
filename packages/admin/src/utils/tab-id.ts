const storageKey = "lucid:tab-id";

/** Restores and removes the tab ID from session storage so reloads retain it while duplicated tabs receive distinct IDs. */
const restore = () => {
	try {
		const stored = sessionStorage.getItem(storageKey);
		sessionStorage.removeItem(storageKey);
		return stored;
	} catch {
		return null;
	}
};

/** Identifies this browser tab for document holds and agent screen calls, keeping the same ID through reloads. */
export const tabId = restore() ?? crypto.randomUUID();

//* stored only while the page is gone, so a reload picks it up and refreshes its own hold even if releasing it failed
window.addEventListener("pagehide", () => {
	try {
		sessionStorage.setItem(storageKey, tabId);
	} catch {}
});
//* a page restored from the back-forward cache is still this tab, so the ID comes out of storage again
window.addEventListener("pageshow", (event) => {
	if (event.persisted) restore();
});
