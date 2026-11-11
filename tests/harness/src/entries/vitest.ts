/** What integration and other Vitest lane tests import. */
export {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
} from "vitest";
export { sql } from "kysely";
export type { Capability } from "../capabilities/types.ts";
export { ADMIN, login, loginWithMagicLink } from "../client/admin.ts";
export { default as countQueries } from "../client/count-queries.ts";
export type { Lucid } from "../client/open-lucid.ts";
export type { ApiResponse, Session } from "../client/types.ts";
export {
	advanceClock,
	requires,
	test,
	useVariant,
} from "../lanes/vitest/test.ts";
export { default as recordDigest } from "../report/record-digest.ts";
export { default as migratedTo } from "../migrations/migrated-to.ts";
export type {
	CliRun,
	MigrationDatabase,
	PrepareDatabase,
	Step,
} from "../migrations/types.ts";
export { notApplicable } from "../report/not-applicable.ts";
