import { describe, expect, it } from "vitest";
import { adminLinkPath, isNavigationLinkActive } from "./navigation";

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

describe("adminLinkPath", () => {
	const origin = "https://cms.example";

	it("keeps admin links on this site, with their query and hash", () => {
		expect(
			adminLinkPath(
				"https://cms.example/admin/requests/8?tab=changes#a",
				origin,
			),
		).toBe("/admin/requests/8?tab=changes#a");
		expect(adminLinkPath("/admin/media", origin)).toBe("/admin/media");
	});

	it("leaves other sites and pages outside the admin alone", () => {
		expect(adminLinkPath("https://other.example/admin/media", origin)).toBe(
			undefined,
		);
		expect(adminLinkPath("https://cms.example/administer", origin)).toBe(
			undefined,
		);
		expect(adminLinkPath("https://cms.example/blog", origin)).toBe(undefined);
	});
});
