/** What browser tests import. */
export { expect } from "@playwright/test";
export type { Capability } from "../capabilities/types.ts";
export { ADMIN } from "../client/admin.ts";
export type { Lucid } from "../client/open-lucid.ts";
export type { Session } from "../client/types.ts";
export { default as migratedTo } from "../migrations/migrated-to.ts";
export {
	requires,
	type ServedMigrations,
	test,
} from "../lanes/playwright/test.ts";
