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

	it("stores CSV files that Windows reports as Excel spreadsheets as CSV", async () => {
		const result = await getFileMetadata({
			mimeType: "application/vnd.ms-excel",
			fileName: "prices.csv",
		});

		expect(result.data).toEqual({
			mimeType: "text/csv",
			type: "document",
			extension: "csv",
		});
	});

	it.for([
		{ fileName: "song.mp3", mimeType: "audio/mpeg", extension: "mp3" },
		{ fileName: "photo.jpeg", mimeType: "image/jpeg", extension: "jpeg" },
		{ fileName: "photo.png", mimeType: "image/jpeg", extension: "jpg" },
	])("names $fileName's extension $extension", async (file) => {
		const result = await getFileMetadata({
			mimeType: file.mimeType,
			fileName: file.fileName,
		});

		expect(result.data?.extension).toBe(file.extension);
	});
});
