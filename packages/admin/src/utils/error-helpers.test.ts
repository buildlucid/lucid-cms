import { describe, expect, test } from "vitest";
import { resolveFieldErrorMessage } from "./error-helpers";

describe("resolveFieldErrorMessage", () => {
	test("resolves literal and descriptor error copy", () => {
		expect(
			resolveFieldErrorMessage({
				type: "lucid.literal",
				value: "Item {{item}} is invalid",
				values: { item: 2 },
			}),
		).toBe("Item 2 is invalid");

		expect(
			resolveFieldErrorMessage({
				type: "lucid.copy",
				scope: "server",
				key: "server:error",
				defaultMessage: "Reference {{ref}} is missing",
				values: { ref: "card" },
			}),
		).toBe("Reference card is missing");
	});
});
