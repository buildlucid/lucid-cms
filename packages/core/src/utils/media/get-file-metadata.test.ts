import { describe, expect, it } from "vitest";
import getFileMetadata from "./get-file-metadata.js";

describe("getFileMetadata", () => {
	it("falls back to application/octet-stream when mime cannot be inferred", async () => {
		const result = await getFileMetadata({
			mimeType: null,
			fileName: "template.mjml",
		});

		expect(result.error).toBeUndefined();
		expect(result.data).toEqual({
			mimeType: "application/octet-stream",
			type: "unknown",
			extension: "mjml",
		});
	});
});
