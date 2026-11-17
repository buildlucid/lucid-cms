import { z } from "@lucidcms/core";
import { createToolkit } from "@lucidcms/core/toolkit";
import type { ServiceFn } from "@lucidcms/core/types";
import { DAY_MS, FORMS_COLLECTION_KEY, formFields } from "../../constants.js";
import type {
	FormsPluginOptionsInternal,
	FormsSubmissionsOptionsInternal,
} from "../parse-plugin-options.js";
import deleteOlderSubmissions, {
	type DeletedSubmissions,
} from "./delete-older-submissions.js";
import type { SubmissionFormMatch } from "./find-expired-submission-ids.js";

const formsSchema = z.array(
	z.object({ fields: z.record(z.string(), z.unknown()) }),
);

const daysAgo = (days: number) => Date.now() - days * DAY_MS;

/**
 * Prunes expired submissions, including binned ones and their files. Uses form retention or the
 * plugin default, including removed forms. Returns deleted and failed counts.
 */
const pruneSubmissions: ServiceFn<
	[
		{
			options: FormsPluginOptionsInternal;
			submissions: FormsSubmissionsOptionsInternal;
		},
	],
	DeletedSubmissions
> = async (context, data) => {
	const { options } = data;
	const fallback = data.submissions.retentionDays;
	/** Each known form's retention in days, or null to keep its submissions. */
	const retention = new Map<string, number | null>();

	if (options.builder !== false) {
		const built = await createToolkit(context).documents.getMultiple({
			collectionKey: FORMS_COLLECTION_KEY,
			version: options.builder.version,
			depth: 0,
			perPage: -1,
		});
		if (built.error) return built;

		for (const { fields } of formsSchema.parse(built.data.items)) {
			const key = fields[formFields.key];
			const days = fields[formFields.retentionDays];
			if (typeof key !== "string") continue;
			retention.set(
				key,
				typeof days === "number" && days > 0 ? days : fallback,
			);
		}
	}
	//* code-defined forms win a key editors also used, as they do when the form is read
	for (const form of options.forms) {
		retention.set(form.key, form.retentionDays);
	}

	const passes: Array<{ form: SubmissionFormMatch; before: number }> = [];
	for (const [key, days] of retention) {
		if (days !== null) {
			passes.push({ form: { is: key }, before: daysAgo(days) });
		}
	}
	if (fallback !== null) {
		passes.push({
			form: { not: [...retention.keys()] },
			before: daysAgo(fallback),
		});
	}

	const counts: DeletedSubmissions = { deleted: 0, failed: 0 };
	for (const pass of passes) {
		const removed = await deleteOlderSubmissions(context, pass);
		if (removed.error) return removed;
		counts.deleted += removed.data.deleted;
		counts.failed += removed.data.failed;
	}

	return { error: undefined, data: counts };
};

export default pruneSubmissions;
