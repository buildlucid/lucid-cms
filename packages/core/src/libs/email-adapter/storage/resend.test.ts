import { describe, expect, test } from "vitest";
import type { ServiceResponse } from "../../../utils/services/types.js";
import { getEmailResendState } from "./index.js";
import type { EmailStorageConfig } from "./types.js";

const unwrap = <T>(response: Awaited<ServiceResponse<T>>) => {
	expect(response.error).toBeUndefined();
	return response.data as T;
};

describe("email storage resend", () => {
	test("disables resend for neverStore rules", () => {
		const storage: EmailStorageConfig = {
			reset_url: {
				neverStore: true,
				previewFallback: "https://example.com/reset/REDACTED",
			},
		};

		expect(
			unwrap(
				getEmailResendState({
					createdAt: new Date(),
					storage,
					resendWindowDays: 7,
				}),
			),
		).toEqual({
			enabled: false,
			reason: "unstoredData",
		});
	});

	test("disables resend outside the configured window", () => {
		expect(
			unwrap(
				getEmailResendState({
					createdAt: "2024-01-01T00:00:00.000Z",
					storage: null,
					resendWindowDays: 7,
					now: new Date("2024-01-10T00:00:00.000Z"),
				}),
			),
		).toEqual({
			enabled: false,
			reason: "outsideResendWindow",
		});
	});
});
