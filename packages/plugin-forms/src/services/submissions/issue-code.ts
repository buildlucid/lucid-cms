import type { z } from "@lucidcms/core";

/** Shorter names for what a length, count or size limit applies to. */
const limits = {
	too_big: { string: "too_long", array: "too_many", set: "too_many" },
	too_small: { string: "too_short", array: "too_few", set: "too_few" },
} as const;

/**
 * Says why an answer was refused, for scripts that word errors themselves: `too_long`,
 * `too_short`, `too_large`, `too_small`, `too_many`, `too_few`, `format` for addresses and dates,
 * `not_an_option`, `step`, or `invalid`. A field type's own refinements can name theirs with
 * `params: { code }`.
 */
const issueCode = (issue: z.core.$ZodIssue | undefined): string => {
	switch (issue?.code) {
		case "too_big":
		case "too_small": {
			const sized: Record<string, string> = limits[issue.code];
			return (
				sized[issue.origin] ??
				(issue.code === "too_big" ? "too_large" : "too_small")
			);
		}
		case "invalid_format":
			return "format";
		case "invalid_value":
			return "not_an_option";
		case "not_multiple_of":
			return "step";
		case "custom":
			return typeof issue.params?.code === "string"
				? issue.params.code
				: "invalid";
		default:
			return "invalid";
	}
};

export default issueCode;
