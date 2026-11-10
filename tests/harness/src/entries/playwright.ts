/** What browser tests import. */
export { expect } from "@playwright/test";
export type { Capability } from "../capabilities/types.ts";
export { ADMIN } from "../client/admin.ts";
export type { Lucid } from "../client/open-lucid.ts";
export { requires, test } from "../lanes/playwright/test.ts";
