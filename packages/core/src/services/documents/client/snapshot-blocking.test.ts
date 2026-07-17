import { describe, expect, it } from "vitest";
import getMultiple from "./get-multiple.js";
import getSingle from "./get-single.js";

const context = {} as never;

describe("client document multi-version targeting", () => {
	it("requires an ID for single snapshot fetches", async () => {
		const response = await getSingle(context, {
			collectionKey: "pages",
			versionType: "snapshot",
			query: {},
		});

		expect(response.error?.status).toBe(400);
		expect(response.data).toBeUndefined();
	});

	it("requires an ID for multiple snapshot fetches", async () => {
		const response = await getMultiple(context, {
			collectionKey: "pages",
			versionType: "snapshot",
			query: {},
		});

		expect(response.error?.status).toBe(400);
		expect(response.data).toBeUndefined();
	});
});
