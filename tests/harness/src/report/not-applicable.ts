/** Starts a skip reason that means the test doesn't apply to the setup. Reports show the reason without it. */
const MARK = "[not applicable] ";

/**
 * Marks a test as not applicable in reports. Pass to the runner's skip function, e.g.
 * `skip(condition, notApplicable("Why"))`. Also used by `requires()`.
 */
export const notApplicable = (reason: string): string => `${MARK}${reason}`;

/** Reads a runner's skip reason: whether it marks the test not applicable, and the reason to show. */
export const readSkipReason = (
	note: string | undefined,
): { notApplicable: boolean; reason: string | undefined } =>
	note?.startsWith(MARK)
		? { notApplicable: true, reason: note.slice(MARK.length) }
		: { notApplicable: false, reason: note };
