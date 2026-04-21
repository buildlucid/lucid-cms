import { describe, expect, test } from "vitest";
import {
	FILE_SYSTEM_DOWNLOAD_PATH,
	FILE_SYSTEM_UPLOAD_PATH,
} from "./adapters/file-system/helpers.js";
import { createSignedMediaUrl, validateSignedMediaUrl } from "./signed-url.js";

describe("signed media URLs", () => {
	test("scopes tokens to the requested path", () => {
		const url = new URL(
			createSignedMediaUrl({
				host: "https://example.com",
				path: FILE_SYSTEM_UPLOAD_PATH,
				key: "public/test.png",
				secretKey: "a".repeat(64),
			}),
		);

		expect(
			validateSignedMediaUrl({
				path: FILE_SYSTEM_UPLOAD_PATH,
				key: url.searchParams.get("key") ?? "",
				token: url.searchParams.get("token") ?? "",
				timestamp: url.searchParams.get("timestamp") ?? "",
				secretKey: "a".repeat(64),
			}),
		).toBe(true);

		expect(
			validateSignedMediaUrl({
				path: FILE_SYSTEM_DOWNLOAD_PATH,
				key: url.searchParams.get("key") ?? "",
				token: url.searchParams.get("token") ?? "",
				timestamp: url.searchParams.get("timestamp") ?? "",
				secretKey: "a".repeat(64),
			}),
		).toBe(false);
	});
});
