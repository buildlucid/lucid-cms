import { expect, test } from "vitest";
import LucidError from "./lucid-error.js";

test("recognises an error thrown by another copy of the class", async () => {
	//* the query string makes this a second evaluation of the module, as a duplicate install would be
	const { default: OtherLucidError } = (await import(
		// @ts-expect-error -- TypeScript does not resolve the query string
		"./lucid-error.js?copy"
	)) as { default: typeof LucidError };
	const thrown = new OtherLucidError({ status: 404, message: "Not found" });

	expect(OtherLucidError).not.toBe(LucidError);
	expect(thrown instanceof LucidError).toBe(true);
	expect(new Error("Not found") instanceof LucidError).toBe(false);
});
