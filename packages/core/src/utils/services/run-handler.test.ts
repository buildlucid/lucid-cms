import { expect, test } from "vitest";
import { LucidError } from "../errors/index.js";
import runHandler from "./run-handler.js";

test("returns the handler's value as data", async () => {
	expect(await runHandler(() => 4)).toEqual({ error: undefined, data: 4 });
	expect(await runHandler(async () => undefined)).toEqual({
		error: undefined,
		data: undefined,
	});
});

test("keeps the details of a thrown LucidError", async () => {
	const result = await runHandler(() => {
		throw new LucidError({
			type: "basic",
			status: 409,
			code: "document_not_found",
			message: "That page is already taken.",
		});
	});

	expect(result.data).toBeUndefined();
	expect(result.error).toMatchObject({
		type: "basic",
		status: 409,
		code: "document_not_found",
		message: { type: "lucid.literal", value: "That page is already taken." },
	});
});

test("turns any other throw into a 500 that carries the cause", async () => {
	const cause = new TypeError("Cannot read properties of undefined");
	const result = await runHandler(async () => {
		throw cause;
	});

	expect(result.error?.status).toBe(500);
	expect(result.error?.cause).toBe(cause);
});
