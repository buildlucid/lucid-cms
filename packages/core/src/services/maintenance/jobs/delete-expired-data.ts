import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import clearExpiredAuthStates from "../tasks/clear-expired-auth-states.js";
import clearExpiredCollections from "../tasks/clear-expired-collections.js";
import clearExpiredJobs from "../tasks/clear-expired-jobs.js";
import clearExpiredLocales from "../tasks/clear-expired-locales.js";
import clearExpiredOAuthData from "../tasks/clear-expired-oauth-data.js";
import clearExpiredPreviewSessions from "../tasks/clear-expired-preview-sessions.js";
import clearExpiredTokens from "../tasks/clear-expired-tokens.js";
import deleteExpiredDeletedDocuments from "../tasks/delete-expired-deleted-documents.js";
import deleteExpiredDeletedMedia from "../tasks/delete-expired-deleted-media.js";
import deleteExpiredDeletedUsers from "../tasks/delete-expired-deleted-users.js";
import deleteExpiredRevisions from "../tasks/delete-expired-revisions.js";
import deleteExpiredUnsyncedMedia from "../tasks/delete-expired-unsynced-media.js";

const tasks = [
	clearExpiredLocales,
	clearExpiredJobs,
	clearExpiredCollections,
	clearExpiredPreviewSessions,
	clearExpiredTokens,
	clearExpiredAuthStates,
	clearExpiredOAuthData,
	deleteExpiredUnsyncedMedia,
	deleteExpiredDeletedMedia,
	deleteExpiredDeletedUsers,
	deleteExpiredDeletedDocuments,
	deleteExpiredRevisions,
];

const deleteExpiredData: JobHandler = async (context) => {
	for (const task of tasks) {
		const result = await task(context);
		if (result.error) return result;
	}

	return { error: undefined, data: undefined };
};

/**
 * Deletes expired data and queues resource-specific deletion jobs. Every task
 * shares one transaction so a failure part way through leaves nothing deleted.
 */
export const deleteExpiredDataJob = defineJob({
	name: "core:delete-expired-data",
	version: 1,
	input: z.null(),
	transaction: true,
	schedules: [
		{
			name: "automatic",
			cron: "0 0 * * *",
			timezone: "UTC",
			input: null,
		},
	],
	handler: deleteExpiredData,
});
