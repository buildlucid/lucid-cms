import { describe, expect, it } from "vitest";
import getUpdateStatus from "./get-update-status.js";

describe("getUpdateStatus", () => {
	it("is current unless npm's latest is newer, including over a prerelease", () => {
		const latest = { version: "1.2.0", requiresCore: null };
		expect(getUpdateStatus({ installed: "1.2.0", latest })).toBe("current");
		expect(getUpdateStatus({ installed: "1.3.0-beta.1", latest })).toBe(
			"current",
		);
		expect(getUpdateStatus({ installed: "1.1.4", latest })).toBe("available");
	});

	it("holds an update back when its core range doesn't fit the installed core", () => {
		const latest = { version: "2.4.0", requiresCore: "^0.20.0" };
		expect(
			getUpdateStatus({ installed: "2.3.0", latest, coreVersion: "0.19.2" }),
		).toBe("needs-core");
		expect(
			getUpdateStatus({ installed: "2.3.0", latest, coreVersion: "0.20.1" }),
		).toBe("available");
		expect(
			getUpdateStatus({
				installed: "2.3.0",
				latest: { version: "2.4.0", requiresCore: "^0.20.0-alpha.0" },
				coreVersion: "0.20.0-alpha.3",
			}),
		).toBe("available");
		//* like npm, a prerelease core only meets ranges that name a prerelease of the same version
		expect(
			getUpdateStatus({
				installed: "2.3.0",
				latest: { version: "2.4.0", requiresCore: ">=0.18.0" },
				coreVersion: "0.19.0-alpha.0",
			}),
		).toBe("needs-core");
	});

	it("ignores core ranges that don't parse", () => {
		expect(
			getUpdateStatus({
				installed: "2.3.0",
				latest: { version: "2.4.0", requiresCore: "workspace:*" },
				coreVersion: "0.19.0",
			}),
		).toBe("available");
	});

	it("is unknown without an answer from npm or a valid version", () => {
		expect(getUpdateStatus({ installed: "1.0.0", latest: null })).toBe(
			"unknown",
		);
		expect(
			getUpdateStatus({
				installed: "file:../plugin",
				latest: { version: "1.0.0", requiresCore: null },
			}),
		).toBe("unknown");
	});
});
