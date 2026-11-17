import { copy, defineCollection, field } from "@lucidcms/core";
import type { CollectionEnvironmentOptions } from "@lucidcms/core/types";
import {
	SUBMISSIONS_COLLECTION_KEY,
	submissionFields,
	submissionStatuses,
} from "../../constants.js";
import type { SubmissionStatus } from "../../types.js";
import type { FormsSubmissionsOptionsInternal } from "../parse-plugin-options.js";

const statusLabels: Record<SubmissionStatus, string> = {
	new: "New",
	read: "Read",
	spam: "Spam",
};

/**
 * Creates the collection submissions are stored in. Only the form adds submissions and writes
 * their answers. People change a submission's status and nothing else. `environments` are the
 * forms collection's, which each submission records the form's own of.
 */
const createSubmissionsCollection = (
	submissions: FormsSubmissionsOptionsInternal,
	environments: readonly CollectionEnvironmentOptions[],
) => {
	//* three to a row with an environment, two without
	const width = environments.length > 0 ? 4 : 6;

	return defineCollection({
		key: SUBMISSIONS_COLLECTION_KEY,
		mode: "multiple",
		group: submissions.group,
		details: {
			labels: {
				singular: copy("admin:plugin.forms.submissions.collection.singular"),
				plural: copy("admin:plugin.forms.submissions.collection.plural"),
			},
			description: copy(
				"admin:plugin.forms.submissions.collection.description",
			),
		},
		ai: {
			instructions:
				"What visitors sent through the website's forms. Answers are in `values.data`, keyed by field name, with each field's label in `values.fields`. Only change `status`.",
		},
		localized: false,
		actions: { create: false },
		//* submissions hold personal data, which belongs in the CSV export people ask for rather than site transfers
		transfer: false,
		fields: [
			field.text(submissionFields.summary, {
				details: {
					label: copy("admin:plugin.forms.submissions.fields.summary.label"),
				},
				localized: false,
				permissions: { update: "system" },
				useAsLabel: true,
				showInList: true,
			}),
			field.text(submissionFields.form, {
				details: {
					label: copy("admin:plugin.forms.submissions.fields.form.label"),
				},
				localized: false,
				index: true,
				permissions: { update: "system" },
				ui: { width },
				showInList: true,
			}),
			...(environments.length > 0
				? [
						field.select(submissionFields.environment, {
							details: {
								label: copy(
									"admin:plugin.forms.submissions.fields.environment.label",
								),
							},
							options: environments.map((environment) => ({
								label: environment.label,
								value: environment.key,
							})),
							index: true,
							permissions: { update: "system" },
							ui: { width },
							showInList: true,
						}),
					]
				: []),
			field.select(submissionFields.status, {
				details: {
					label: copy("admin:plugin.forms.submissions.fields.status.label"),
				},
				options: submissionStatuses.map((status) => ({
					label: copy(`admin:plugin.forms.submissions.status.${status}`, {
						defaultMessage: statusLabels[status],
					}),
					value: status,
				})),
				default: "new",
				index: true,
				validation: { required: true },
				ui: { width },
				showInList: true,
			}),
			field.json(submissionFields.values, {
				details: {
					label: copy("admin:plugin.forms.submissions.fields.values.label"),
				},
				permissions: { update: "system" },
			}),
			field.email(submissionFields.emails, {
				details: {
					label: copy("admin:plugin.forms.submissions.fields.emails.label"),
				},
				multiple: true,
				permissions: { update: "system" },
			}),
		],
	});
};

export default createSubmissionsCollection;
