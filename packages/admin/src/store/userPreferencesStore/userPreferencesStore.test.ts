import { describe, expect, it } from "vitest";
import {
	createUserPreferencesStore,
	USER_PREFERENCES_STORAGE_KEY,
} from "./userPreferencesStore";

const createMemoryStorage = (): Storage => {
	const items = new Map<string, string>();
	return {
		get length() {
			return items.size;
		},
		clear: () => items.clear(),
		getItem: (key) => items.get(key) ?? null,
		key: (index) => [...items.keys()][index] ?? null,
		removeItem: (key) => items.delete(key),
		setItem: (key, value) => items.set(key, value),
	};
};

describe("agent preference", () => {
	it("persists the chosen agent across store instances", () => {
		const storage = createMemoryStorage();
		createUserPreferencesStore({ storage }).setAgentKey("seo");

		expect(createUserPreferencesStore({ storage }).getAgentKey()).toBe("seo");
	});
});

describe("navigation group preferences", () => {
	it("persists open state across store instances", () => {
		const storage = createMemoryStorage();
		createUserPreferencesStore({ storage }).setNavigationGroupOpen(
			"lucid:system",
			false,
		);

		const reloaded = createUserPreferencesStore({ storage });
		expect(reloaded.getNavigationGroupOpen("lucid:system")).toBe(false);
		expect(reloaded.getNavigationGroupOpen("blog")).toBeUndefined();
	});

	it("drops stored values that are not booleans", () => {
		const storage = createMemoryStorage();
		storage.setItem(
			USER_PREFERENCES_STORAGE_KEY,
			JSON.stringify({
				version: 1,
				preferences: { navigationGroups: { blog: "no", pages: false } },
			}),
		);

		const store = createUserPreferencesStore({ storage });
		expect(store.getNavigationGroupOpen("blog")).toBeUndefined();
		expect(store.getNavigationGroupOpen("pages")).toBe(false);
	});
});
