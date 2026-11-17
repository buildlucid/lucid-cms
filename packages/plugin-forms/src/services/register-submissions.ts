import { LucidError } from "@lucidcms/core";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import exportSubmissionsConfig from "../admin/components/ExportSubmissions/config.js";
import submissionAnswersConfig from "../admin/components/SubmissionAnswers/config.js";
import {
	PLUGIN_KEY,
	SUBMISSIONS_COLLECTION_KEY,
	submissionFields,
} from "../constants.js";
import createPruneSubmissionsJob from "../jobs/prune-submissions.js";
import submissionFilesMigration from "../migrations/1789200000000-forms-submission-files.js";
import submissionReceived from "../notifications/submission-received.js";
import submissionsRoutes from "../routes/submissions.js";
import createSubmissionsCollection from "./collections/create-submissions-collection.js";
import submissionBeforeDeleteHandler from "./hooks/submission-before-delete-handler.js";
import type {
	FormsPluginOptionsInternal,
	FormsSubmissionsOptionsInternal,
} from "./parse-plugin-options.js";

/**
 * Adds the collection submissions are stored in and the table linking them to their files, with
 * the notification sent to people who can read them, the admin routes and sidebar section that
 * export them, the list that shows their answers, the hook that removes their files with them and
 * the daily job that deletes old ones.
 */
const registerSubmissions = (
	draft: ResolvedLucidConfig,
	options: FormsPluginOptionsInternal,
	submissions: FormsSubmissionsOptionsInternal,
) => {
	if (
		draft.collections.some(
			(collection) => collection.key === SUBMISSIONS_COLLECTION_KEY,
		)
	) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `Collection key '${SUBMISSIONS_COLLECTION_KEY}' is reserved for the forms plugin's submissions. Rename the collection or set 'submissions: false'.`,
		});
	}

	draft.collections.push(
		createSubmissionsCollection(
			submissions,
			(options.builder && options.builder.publishing?.environments) || [],
		),
	);
	//* its audience is people who can read this collection, so it only exists beside it
	draft.notifications.push(submissionReceived);
	draft.migrations.push({
		name: "1789200000000-forms-submission-files",
		migration: submissionFilesMigration,
	});
	draft.http.routes.push(...submissionsRoutes());
	draft.jobs.push(createPruneSubmissionsJob(options, submissions));
	draft.hooks.push({
		service: "documents",
		event: "beforeDelete",
		handler: submissionBeforeDeleteHandler,
	});
	draft.admin.slots.push(
		submissionAnswersConfig(),
		exportSubmissionsConfig(SUBMISSIONS_COLLECTION_KEY, submissionFields.form),
	);
};

export default registerSubmissions;
