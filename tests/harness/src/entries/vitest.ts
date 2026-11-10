/** What integration and other Vitest lane tests import. */
export {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
} from "vitest";
export type { Capability } from "../capabilities/types.ts";
export { ADMIN, login } from "../client/admin.ts";
export type { Lucid } from "../client/open-lucid.ts";
export type { Session } from "../client/types.ts";
export { requires, test } from "../lanes/vitest/test.ts";
