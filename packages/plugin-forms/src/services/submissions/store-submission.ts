import { createToolkit } from "@lucidcms/core/toolkit";
import type { ServiceFn } from "@lucidcms/core/types";
import {
	SUBMISSIONS_COLLECTION_KEY,
	submissionFields,
} from "../../constants.js";
import hookEvents from "../../hook-events/index.js";
import submissionReceived from "../../notifications/submission-received.js";
import type {
	FormSettings,
	FormSubmitResult,
	FormValues,
	SubmissionValues,
} from "../../types.js";
import buildSummary from "./build-summary.js";
import formatAnswer from "./format-answer.js";
import linkSubmissionFiles from "./link-submission-files.js";
import sendEmails from "./send-emails.js";
import uploadFiles from "./upload-files.js";
import type { AcceptedFiles } from "./validate-files.js";

/**
 * Stores validated files and submission data, queues emails, notifies recipients and runs
 * `afterSubmit`. Run transactionally to roll back failures and avoid sending emails for unsaved
 * submissions.
 */
const storeSubmission: ServiceFn<
	[{ form: FormSettings; values: FormValues; accepted: AcceptedFiles[] }],
	FormSubmitResult
> = async (context, data) => {
	const toolkit = createToolkit(context);
	const { form, values } = data;

	const filesRes = await uploadFiles(context, { accepted: data.accepted });
	if (filesRes.error) return filesRes;
	const files = filesRes.data;

	const answers: Record<string, string> = {};
	for (const formField of form.fields) {
		answers[formField.name] =
			formField.control === "file"
				? files
						.filter((file) => file.field === formField.name)
						.map((file) => file.fileName)
						.join(", ")
				: formatAnswer(formField, values[formField.name] ?? null);
	}
	const summary = buildSummary(form, answers);

	const emailsRes = await sendEmails(context, { form, answers });
	if (emailsRes.error) return emailsRes;

	let submissionId: number | null = null;
	if (form.store) {
		const created = await toolkit.documents.createSingle({
			collectionKey: SUBMISSIONS_COLLECTION_KEY,
			actor: { type: "system" },
			data: {
				fields: {
					[submissionFields.summary]: summary,
					[submissionFields.form]: form.key,
					[submissionFields.status]: "new",
					//* left out for collections without environments, which have no such field
					...(form.environment === null
						? {}
						: { [submissionFields.environment]: form.environment }),
					[submissionFields.values]: {
						data: values,
						fields: form.fields.map(({ name, label, type, control }) => ({
							name,
							label,
							type,
							control,
						})),
						files,
					} satisfies SubmissionValues,
					[submissionFields.emails]: emailsRes.data,
				},
			},
		});
		if (created.error) return created;
		submissionId = created.data.id;

		const linked = await linkSubmissionFiles(context, {
			submissionId,
			mediaIds: files.map((file) => file.mediaId),
		});
		if (linked.error) return linked;
	}

	if (form.notify) {
		const notified = await toolkit.notifications.send({
			type: submissionReceived,
			data: { formName: form.name, summary, submissionId },
		});
		if (notified.error) return notified;
	}

	const after = await hookEvents.execute(context, "afterSubmit", {
		meta: { form },
		data: { values, files, submissionId },
	});
	if (after.error) return after;

	return {
		error: undefined,
		data: { confirmation: form.confirmation, submissionId },
	};
};

export default storeSubmission;
