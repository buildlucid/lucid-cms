/** What browser tests import. */
export { expect, type Page } from "@playwright/test";
export type { Capability } from "../capabilities/types.ts";
export { ADMIN } from "../client/admin.ts";
export { default as addVirtualAuthenticator } from "../lanes/playwright/add-virtual-authenticator.ts";
export { default as signInTo } from "../lanes/playwright/sign-in-to.ts";
export type { Lucid } from "../client/open-lucid.ts";
export type { Session } from "../client/types.ts";
export { default as migratedTo } from "../migrations/migrated-to.ts";
export type { MigrationDatabase } from "../migrations/types.ts";
export {
	requires,
	type ServedMigrations,
	test,
} from "../lanes/playwright/test.ts";
export { notApplicable } from "../report/not-applicable.ts";
