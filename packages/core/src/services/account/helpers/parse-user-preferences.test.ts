import { describe, expect, it } from "vitest";
import parseUserPreferences from "./parse-user-preferences.js";

describe("parseUserPreferences", () => {
	it("drops keys that no longer match the schema and keeps the rest", () => {
		expect(
			parseUserPreferences({
				aiHidden: true,
				agentModels: { seo: "reasoning-model" },
				home: { view: "overview", widgets: [{ key: "lucid.storage" }] },
				removedKey: "value",
			}),
		).toEqual({
			aiHidden: true,
			home: { view: "overview", widgets: [{ key: "lucid.storage" }] },
		});
	});

	it("returns no preferences for stored values that are not objects", () => {
		expect(parseUserPreferences(null)).toEqual({});
		expect(parseUserPreferences(undefined)).toEqual({});
	});
});
