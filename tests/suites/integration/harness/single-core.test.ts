import { createRequire } from "node:module";
import { LucidError } from "@lucidcms/core";
import { expect, requires, test } from "#harness/vitest";

requires("mode:host");

test("the test process and the setup's config share one copy of core", () => {
	//* `require` loads through Node itself, as a setup's config does, and skips the test runner's loading
	const native = createRequire(import.meta.url)("@lucidcms/core") as {
		LucidError: typeof LucidError;
	};

	expect(native.LucidError).toBe(LucidError);
});
