import { describe, expect, test } from "vitest";
import { STORAGE_DOWNLOAD_PATH, STORAGE_UPLOAD_PATH } from "../constants.js";
import {
	createSignedMediaUrl,
	validateSignedMediaUrl,
} from "./signed-media-url.js";

describe("signed media URLs", () => {
	test("rejects reusing an upload token for the download path", () => {
		const url = new URL(
			createSignedMediaUrl({
				host: "https://example.com",
				path: STORAGE_UPLOAD_PATH,
				key: "public/test.png",
				secretKey: "a".repeat(64),
				query: {
					extension: "png",
				},
			}),
		);

		expect(
			validateSignedMediaUrl({
				path: STORAGE_UPLOAD_PATH,
				key: url.searchParams.get("key") as string,
				token: url.searchParams.get("token") as string,
				timestamp: url.searchParams.get("timestamp") as string,
				secretKey: "a".repeat(64),
				query: {
					extension: url.searchParams.get("extension") as string,
				},
			}),
		).toBe(true);

		expect(
			validateSignedMediaUrl({
				path: STORAGE_DOWNLOAD_PATH,
				key: url.searchParams.get("key") as string,
				token: url.searchParams.get("token") as string,
				timestamp: url.searchParams.get("timestamp") as string,
				secretKey: "a".repeat(64),
			}),
		).toBe(false);
	});

	test("rejects tampering with signed query values", () => {
		const url = new URL(
			createSignedMediaUrl({
				host: "https://example.com",
				path: STORAGE_UPLOAD_PATH,
				key: "public/test.png",
				secretKey: "a".repeat(64),
				query: {
					extension: "png",
				},
			}),
		);

		expect(
			validateSignedMediaUrl({
				path: STORAGE_UPLOAD_PATH,
				key: url.searchParams.get("key") as string,
				token: url.searchParams.get("token") as string,
				timestamp: url.searchParams.get("timestamp") as string,
				secretKey: "a".repeat(64),
				query: {
					extension: "jpg",
				},
			}),
		).toBe(false);
	});
});
