import { describe, expect, it } from "vitest";
import getMultiple from "./get-multiple.js";
import getSingle from "./get-single.js";

const context = {} as never;

describe("client document snapshot blocking", () => {
	it("returns 404 for single snapshot fetches", async () => {
		const response = await getSingle(context, {
			collectionKey: "pages",
			status: "snapshot",
			query: {},
		});

		expect(response.error?.status).toBe(404);
		expect(response.data).toBeUndefined();
	});

	it("returns 404 for multiple snapshot fetches", async () => {
		const response = await getMultiple(context, {
			collectionKey: "pages",
			status: "snapshot",
			query: {},
		});

		expect(response.error?.status).toBe(404);
		expect(response.data).toBeUndefined();
	});
});
