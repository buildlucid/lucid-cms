import { beforeEach, test as base } from "vitest";
import {
	describeMissing,
	findMissing,
} from "../../capabilities/find-missing.ts";
import type { Capability } from "../../capabilities/types.ts";
import openLucid, { type Lucid } from "../../client/open-lucid.ts";
import loadContext from "../../environment/load-context.ts";
import type { JsonObject } from "../../utils/json.ts";

declare module "vitest" {
	interface TaskMeta {
		/** Extra data for the harness report, such as a simulation's seed and digest. */
		harness?: JsonObject;
	}
}

/**
 * Vitest's `test` with the CMS under test as `lucid`.
 * Each test file shares one `lucid`. In host mode that is a fresh CMS and database for the file.
 */
export const test = base.extend<{ lucid: Lucid }>({
	lucid: [
		// oxlint-disable-next-line no-empty-pattern -- Vitest reads a fixture's needs from this pattern
		async ({}, use) => {
			const lucid = await openLucid(loadContext());
			await use(lucid);
			await lucid.close();
		},
		{ scope: "file" },
	],
});

/**
 * Skips the tests around it when the setup lacks a capability, with the reason in the report.
 * Call it at the top of a file or inside a `describe`.
 *
 * @example
 * ```ts
 * describe("page paths", () => {
 * 	requires("plugin:pages");
 *
 * 	test("builds a full path", async ({ lucid }) => {});
 * });
 * ```
 */
export const requires = (...required: Capability[]): void => {
	const missing = findMissing(loadContext().capabilities, required);
	if (missing.length === 0) {
		return;
	}

	beforeEach(({ skip }) => {
		skip(describeMissing(missing));
	});
};
