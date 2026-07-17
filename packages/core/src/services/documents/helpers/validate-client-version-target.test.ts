import { describe, expect, it } from "vitest";
import validateClientVersionTarget from "./validate-client-version-target.js";

describe("client document version targets", () => {
	it.each([
		"revision",
		"snapshot",
	])("requires a version ID for %s targets", async (versionType) => {
		const response = await validateClientVersionTarget({ versionType });

		expect(response.error?.status).toBe(400);
	});

	it("accepts an exact snapshot version", async () => {
		const response = await validateClientVersionTarget({
			versionType: "snapshot",
			versionId: 42,
		});

		expect(response).toEqual({
			error: undefined,
			data: { versionId: 42 },
		});
	});

	it("rejects version IDs for moving latest and environment targets", async () => {
		const response = await validateClientVersionTarget({
			versionType: "production",
			versionId: 42,
		});

		expect(response.error?.status).toBe(400);
	});
});
