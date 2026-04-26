import { describe, expect, test } from "vitest";
import testingConstants from "../../../constants/testing-constants.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import {
	createStoredEmailData,
	resolveEmailData,
	stripNeverStoreEmailData,
} from "./index.js";
import type { EmailStorageConfig } from "./types.js";

const encryptionKey = testingConstants.key;
const unwrap = <T>(response: Awaited<ServiceResponse<T>>) => {
	expect(response.error).toBeUndefined();
	return response.data as T;
};

describe("email storage data", () => {
	test("encrypts and decrypts JSON values", async () => {
		const data = {
			string: "secret",
			object: {
				value: "nested",
			},
			array: ["first", 2],
			nil: null,
			bool: true,
			num: 42,
		};
		const storage: EmailStorageConfig = {
			string: { encrypt: true },
			object: { encrypt: true },
			array: { encrypt: true },
			nil: { encrypt: true },
			bool: { encrypt: true },
			num: { encrypt: true },
		};

		const stored = unwrap(
			createStoredEmailData({
				data,
				storage,
				encryptionKey,
			}),
		);

		expect(JSON.stringify(stored)).not.toContain("secret");
		expect(JSON.stringify(stored)).not.toContain("nested");

		expect(
			unwrap(
				resolveEmailData({
					data: stored,
					storage,
					encryptionKey,
					mode: "send",
				}),
			),
		).toEqual(data);
	});

	test("supports dot paths, indexes, wildcards, missing paths, and preview redaction", async () => {
		const data = {
			payload: {
				ssn: "123-45-6789",
			},
			payload2: ["alpha", "beta"],
			payload4: {
				array: [
					{
						token: "one",
					},
					{
						token: "two",
					},
				],
			},
		};
		const storage: EmailStorageConfig = {
			"payload.ssn": {
				encrypt: true,
				redact: true,
				previewFallback: "[protected data]",
			},
			"payload2[0]": {
				encrypt: true,
			},
			"payload4.array[*].token": {
				encrypt: true,
				redact: true,
				previewFallback: "[protected token]",
			},
			missing_path: {
				redact: true,
				previewFallback: "[missing fallback]",
			},
		};

		const stored = unwrap(
			createStoredEmailData({
				data,
				storage,
				encryptionKey,
			}),
		);

		expect(JSON.stringify(stored)).not.toContain("123-45-6789");
		expect(JSON.stringify(stored)).not.toContain("alpha");
		expect(JSON.stringify(stored)).not.toContain("one");
		expect(JSON.stringify(stored)).not.toContain("two");

		expect(
			unwrap(
				resolveEmailData({
					data: stored,
					storage,
					encryptionKey,
					mode: "send",
				}),
			),
		).toEqual(data);

		expect(
			unwrap(
				resolveEmailData({
					data: stored,
					storage,
					encryptionKey,
					mode: "preview",
				}),
			),
		).toEqual({
			payload: {
				ssn: "[protected data]",
			},
			payload2: ["alpha", "beta"],
			payload4: {
				array: [
					{
						token: "[protected token]",
					},
					{
						token: "[protected token]",
					},
				],
			},
			missing_path: "[missing fallback]",
		});
	});

	test("lets more specific preview fallbacks win over broader selectors", async () => {
		const data = {
			payload: [
				{
					token: "one",
					other: "value",
				},
			],
		};
		const storage: EmailStorageConfig = {
			"payload[*]": {
				redact: true,
				previewFallback: {
					token: "[payload]",
				},
			},
			"payload[0].token": {
				redact: true,
				previewFallback: "[token]",
			},
		};

		expect(
			unwrap(
				resolveEmailData({
					data,
					storage,
					encryptionKey,
					mode: "preview",
				}),
			),
		).toEqual({
			payload: [
				{
					token: "[token]",
				},
			],
		});
	});

	test("strips neverStore fields after send", async () => {
		const data = {
			reset_url: "https://example.com/reset/token",
			payload: ["token-one", "token-two"],
			name: "Ada",
		};
		const storage: EmailStorageConfig = {
			reset_url: {
				neverStore: true,
				previewFallback: "https://example.com/reset/REDACTED",
			},
			"payload[*]": {
				neverStore: true,
				previewFallback: "REDACTED",
			},
		};

		const stored = unwrap(
			createStoredEmailData({
				data,
				storage,
				encryptionKey,
			}),
		);
		const sendData = unwrap(
			resolveEmailData({
				data: stored,
				storage,
				encryptionKey,
				mode: "send",
			}),
		);
		const stripped = unwrap(
			stripNeverStoreEmailData({
				data: sendData,
				storage,
			}),
		);
		const cleaned = unwrap(
			createStoredEmailData({
				data: stripped,
				storage,
				encryptionKey,
				options: {
					encryptNeverStore: false,
				},
			}),
		);

		expect(sendData).toEqual(data);
		expect(cleaned).toEqual({ payload: [null, null], name: "Ada" });
		expect(
			unwrap(
				resolveEmailData({
					data: cleaned,
					storage,
					encryptionKey,
					mode: "preview",
				}),
			),
		).toEqual({
			reset_url: "https://example.com/reset/REDACTED",
			payload: ["REDACTED", "REDACTED"],
			name: "Ada",
		});
	});
});
