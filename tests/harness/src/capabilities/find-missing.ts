import { notApplicable } from "../report/not-applicable.ts";
import type { Capability } from "./types.ts";

/** Returns the required capabilities a setup lacks. */
export const findMissing = (
	available: readonly Capability[],
	required: readonly Capability[],
): Capability[] =>
	required.filter((capability) => !available.includes(capability));

/** The reason a test does not apply to a setup that lacks capabilities, marked as not applicable. */
export const describeMissing = (missing: readonly Capability[]): string =>
	notApplicable(`Setup lacks ${missing.join(", ")}`);
