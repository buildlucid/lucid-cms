import { describe, expect, it } from "vitest";
import { isSameScreen, screenLabel } from "./agent-screen";

describe("screenLabel", () => {
	it("shortens long document labels to what the server takes, rather than stop the message", () => {
		const label = screenLabel("a".repeat(250));
		expect(label).toHaveLength(200);
		expect(label.endsWith("…")).toBe(true);
		expect(screenLabel("  Homepage  ")).toBe("Homepage");
	});
});

describe("isSameScreen", () => {
	it("keeps a list the same screen as its label and filter change, but not across folders or tabs", () => {
		const media = {
			type: "media",
			tabId: "tab",
			label: "Media",
			folderId: 1,
			filter: null,
		} as const;
		expect(
			isSameScreen(media, { ...media, label: "Photos", filter: "Mine" }),
		).toBe(true);
		expect(isSameScreen(media, { ...media, folderId: 2 })).toBe(false);
		expect(isSameScreen(media, { ...media, tabId: "other" })).toBe(false);
		expect(
			isSameScreen(media, { type: "review", tabId: "tab", label: "Review" }),
		).toBe(false);
	});
});
