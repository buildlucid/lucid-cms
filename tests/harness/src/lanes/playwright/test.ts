import { test as base } from "@playwright/test";
import {
	describeMissing,
	findMissing,
} from "../../capabilities/find-missing.ts";
import type { Capability } from "../../capabilities/types.ts";
import openLucid, { type Lucid } from "../../client/open-lucid.ts";
import loadContext from "../../environment/load-context.ts";

/**
 * Playwright's `test` with the CMS under test as `lucid`, for preparing data over the API.
 * The browser starts signed in as the seeded admin.
 */
export const test = base.extend<object, { lucid: Lucid }>({
	lucid: [
		// oxlint-disable-next-line no-empty-pattern -- Playwright reads a fixture's needs from this pattern
		async ({}, use) => {
			const lucid = await openLucid(loadContext());
			await use(lucid);
			await lucid.close();
		},
		{ scope: "worker" },
	],
});

/**
 * Skips the tests around it when the setup lacks a capability, with the reason in the report.
 * Call it at the top of a file or inside a `test.describe`.
 */
export const requires = (...required: Capability[]): void => {
	const missing = findMissing(loadContext().capabilities, required);
	test.skip(missing.length > 0, describeMissing(missing));
};
