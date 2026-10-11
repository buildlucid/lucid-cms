import { beforeEach, expect, test, vi } from "vitest";

const storageKey = "lucid:tab-id";

/** Loads the module afresh, as a new page in the same tab would. */
const loadTabId = async () => {
	vi.resetModules();
	return (await import("./tab-id")).tabId;
};

beforeEach(() => {
	sessionStorage.clear();
});

test("a reload keeps the tab's ID, while a tab copied from it starts with its own", async () => {
	const first = await loadTabId();
	expect(sessionStorage.getItem(storageKey)).toBeNull();

	window.dispatchEvent(new PageTransitionEvent("pagehide"));
	expect(sessionStorage.getItem(storageKey)).toBe(first);

	expect(await loadTabId()).toBe(first);
	//* a duplicate copies storage now, which no longer holds the ID
	expect(sessionStorage.getItem(storageKey)).toBeNull();
	expect(await loadTabId()).not.toBe(first);
});
