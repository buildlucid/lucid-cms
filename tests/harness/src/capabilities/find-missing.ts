import type { Capability } from "./types.ts";

/** Returns the required capabilities a setup lacks. */
export const findMissing = (
	available: readonly Capability[],
	required: readonly Capability[],
): Capability[] =>
	required.filter((capability) => !available.includes(capability));

const NOT_APPLICABLE_PREFIX = "Setup lacks ";

/** The reason a test does not apply to a setup, as reports show it. */
export const describeMissing = (missing: readonly Capability[]): string =>
	`${NOT_APPLICABLE_PREFIX}${missing.join(", ")}`;

/** Whether a skip came from `requires()`, so the test does not apply, rather than from an explicit skip. */
export const isNotApplicable = (skipReason: string | undefined): boolean =>
	skipReason?.startsWith(NOT_APPLICABLE_PREFIX) ?? false;
