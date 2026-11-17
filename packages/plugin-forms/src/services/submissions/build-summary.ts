import { submissions } from "../../constants.js";
import type { FormSettings } from "../../types.js";

/** Controls whose answers say who a submission is from or what it is about, in the order they are preferred. */
const preferred = ["email", "text", "textarea", "tel"] as const;

/**
 * Picks the answer the submissions list shows for a submission: its first email address, or else
 * its first text answer. Falls back to the form's name when it has neither.
 */
const buildSummary = (
	form: FormSettings,
	answers: Record<string, string>,
): string => {
	for (const control of preferred) {
		for (const formField of form.fields) {
			const answer = answers[formField.name]?.trim();
			if (formField.control === control && answer) {
				return answer.length > submissions.summaryLength
					? `${answer.slice(0, submissions.summaryLength - 1)}…`
					: answer;
			}
		}
	}

	return form.name;
};

export default buildSummary;
