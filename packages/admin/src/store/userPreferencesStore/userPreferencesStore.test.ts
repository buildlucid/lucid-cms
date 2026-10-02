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

	it("remembers a separate model and effort for each agent", () => {
		const storage = createMemoryStorage();
		const store = createUserPreferencesStore({ storage });
		store.setAgentModelSelection("seo", {
			modelId: "reasoning-model",
			reasoningEffort: "high",
		});
		store.setAgentModelSelection("editor", {
			modelId: "fast-model",
			reasoningEffort: null,
		});

		const reloaded = createUserPreferencesStore({ storage });
		expect(reloaded.getAgentModelSelection("seo")).toEqual({
			modelId: "reasoning-model",
			reasoningEffort: "high",
		});
		expect(reloaded.getAgentModelSelection("editor")).toEqual({
			modelId: "fast-model",
			reasoningEffort: null,
		});
		expect(reloaded.getAgentModelSelection("new-agent")).toBeUndefined();
	});

	it("drops malformed model preferences while keeping valid entries", () => {
		const storage = createMemoryStorage();
		storage.setItem(
			USER_PREFERENCES_STORAGE_KEY,
			JSON.stringify({
				version: 1,
				preferences: {
					agentKey: "seo",
					agentModels: {
						seo: { modelId: "reasoning-model", reasoningEffort: "high" },
						defaultEffort: { modelId: "reasoning-model" },
						missingModel: { reasoningEffort: "low" },
						emptyModel: { modelId: "" },
						invalidEffort: {
							modelId: "reasoning-model",
							reasoningEffort: "max",
						},
					},
				},
			}),
		);

		const store = createUserPreferencesStore({ storage });
		expect(store.getAgentKey()).toBe("seo");
		expect(store.getAgentModelSelection("seo")?.reasoningEffort).toBe("high");
		expect(store.getAgentModelSelection("defaultEffort")?.modelId).toBe(
			"reasoning-model",
		);
		expect(store.getAgentModelSelection("missingModel")).toBeUndefined();
		expect(store.getAgentModelSelection("emptyModel")).toBeUndefined();
		expect(store.getAgentModelSelection("invalidEffort")).toBeUndefined();
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
