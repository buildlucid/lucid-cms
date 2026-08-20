import { describe, expect, it } from "vitest";
import { isNavigationLinkActive } from "./navigation";

describe("isNavigationLinkActive", () => {
	it("matches nested routes by default", () => {
		expect(
			isNavigationLinkActive("/lucid/publishing/requests", "/lucid/publishing"),
		).toBe(true);
	});

	it("supports exact links for a parent overview route", () => {
		expect(
			isNavigationLinkActive(
				"/lucid/publishing/requests",
				"/lucid/publishing",
				true,
			),
		).toBe(false);
		expect(
			isNavigationLinkActive("/lucid/publishing", "/lucid/publishing", true),
		).toBe(true);
	});
});
