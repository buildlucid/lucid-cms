import { describe, expect, test } from "vitest";
import type { ServiceResponse } from "../../../utils/services/types.js";
import {
	normalizeEmailStorageConfig,
	parseEmailStorageSelector,
} from "./index.js";
import type { EmailStorageConfig } from "./types.js";

const unwrap = <T>(response: Awaited<ServiceResponse<T>>) => {
	expect(response.error).toBeUndefined();
	return response.data as T;
};

describe("email storage config", () => {
	test("rejects invalid rule flags as error values", () => {
		expect(
			normalizeEmailStorageConfig({
				secret: {
					encrypt: false,
				},
			} as unknown as EmailStorageConfig).error?.message,
		).toContain("can only set encrypt to true");

		expect(
			normalizeEmailStorageConfig({
				secret: {
					neverStore: true,
					encrypt: true,
				},
			} as unknown as EmailStorageConfig).error?.message,
		).toContain("cannot combine neverStore");

		expect(
			normalizeEmailStorageConfig({
				secret: {},
			} as unknown as EmailStorageConfig).error?.message,
		).toContain("must set encrypt, redact, or neverStore");
	});

	test("parses selectors for dot paths, indexes, wildcards, and chaining", () => {
		expect(unwrap(parseEmailStorageSelector("payload.ssn"))).toEqual([
			{ type: "key", key: "payload" },
			{ type: "key", key: "ssn" },
		]);
		expect(unwrap(parseEmailStorageSelector("payload2[0]"))).toEqual([
			{ type: "key", key: "payload2" },
			{ type: "index", index: 0 },
		]);
		expect(unwrap(parseEmailStorageSelector("payload3[*]"))).toEqual([
			{ type: "key", key: "payload3" },
			{ type: "wildcard" },
		]);
		expect(
			unwrap(parseEmailStorageSelector("payload4.array[*].token")),
		).toEqual([
			{ type: "key", key: "payload4" },
			{ type: "key", key: "array" },
			{ type: "wildcard" },
			{ type: "key", key: "token" },
		]);
		expect(parseEmailStorageSelector("payload[").error?.message).toContain(
			"Invalid email storage selector",
		);
		expect(parseEmailStorageSelector("payload[]").error?.message).toContain(
			"Invalid email storage selector",
		);
		expect(parseEmailStorageSelector("payload..ssn").error?.message).toContain(
			"Invalid email storage selector",
		);
	});
});
