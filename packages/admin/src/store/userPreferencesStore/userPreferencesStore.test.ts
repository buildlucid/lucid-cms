import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createUserPreferencesStore,
	SYNCED_SAVE_DELAY,
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

describe("synced preferences", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("saves changes made close together in one request", () => {
		vi.useFakeTimers();
		const save = vi.fn(() => Promise.resolve());
		const store = createUserPreferencesStore({ save });
		store.setAgentKey("seo");
		store.setAgentModelSelection("seo", {
			modelId: "reasoning-model",
			reasoningEffort: "high",
		});
		store.setAiHidden(true);

		expect(store.getAgentKey()).toBe("seo");
		expect(save).not.toHaveBeenCalled();

		vi.advanceTimersByTime(SYNCED_SAVE_DELAY);
		expect(save).toHaveBeenCalledOnce();
		expect(save).toHaveBeenCalledWith({
			agentKey: "seo",
			agentModels: {
				seo: { modelId: "reasoning-model", reasoningEffort: "high" },
			},
			aiHidden: true,
		});
	});

	it("keeps unsaved changes when the account's preferences load", () => {
		vi.useFakeTimers();
		const store = createUserPreferencesStore({
			save: () => Promise.resolve(),
		});
		store.setAgentKey("seo");
		store.hydrate({ agentKey: "editor", aiHidden: true });

		expect(store.getAgentKey()).toBe("seo");
		expect(store.getAiHidden()).toBe(true);

		vi.advanceTimersByTime(SYNCED_SAVE_DELAY);
		store.hydrate({ agentKey: "editor" });
		expect(store.getAgentKey()).toBe("editor");
		expect(store.getAiHidden()).toBe(false);
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
