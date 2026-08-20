import { describe, expect, test } from "vitest";
import {
	hasPublishOperationContextChanged,
	hasPublishOperationRequirementDrift,
} from "./publish-operations";

describe("publish operation context helpers", () => {
	test("detects required environments that no longer match the request", () => {
		expect(
			hasPublishOperationRequirementDrift({
				releaseRequirements: [{ target: "staging", status: "out-of-sync" }],
			}),
		).toBe(true);
		expect(
			hasPublishOperationRequirementDrift({
				releaseRequirements: [{ target: "staging", status: "in-sync" }],
			}),
		).toBe(false);
	});

	test("treats latest or requirement drift as a changed release context", () => {
		expect(
			hasPublishOperationContextChanged({
				isOutdated: true,
				releaseRequirements: [],
			}),
		).toBe(true);
		expect(
			hasPublishOperationContextChanged({
				isOutdated: false,
				releaseRequirements: [{ target: "staging", status: "unreleased" }],
			}),
		).toBe(true);
	});
});
