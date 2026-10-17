import { describe, expect, it } from "vitest";
import { isNavigationLinkActive } from "./navigation";

describe("isNavigationLinkActive", () => {
	it("matches nested routes by default", () => {
		expect(
			isNavigationLinkActive("/admin/publishing/overview", "/admin/publishing"),
		).toBe(true);
	});

	it("supports exact links for a parent overview route", () => {
		expect(
			isNavigationLinkActive(
				"/admin/publishing/overview",
				"/admin/publishing",
				true,
			),
		).toBe(false);
		expect(
			isNavigationLinkActive("/admin/publishing", "/admin/publishing", true),
		).toBe(true);
	});
});
