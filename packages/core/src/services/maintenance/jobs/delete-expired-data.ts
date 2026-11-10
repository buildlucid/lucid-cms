import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobService } from "../../../libs/jobs/types.js";
import { LucidError } from "../../../utils/errors/index.js";
import clearExpiredAuthStates from "../tasks/clear-expired-auth-states.js";
import clearExpiredCollections from "../tasks/clear-expired-collections.js";
import clearExpiredDeployRuns from "../tasks/clear-expired-deploy-runs.js";
import clearExpiredJobs from "../tasks/clear-expired-jobs.js";
import clearExpiredLocales from "../tasks/clear-expired-locales.js";
import clearExpiredOAuthData from "../tasks/clear-expired-oauth-data.js";
import clearExpiredPasskeyChallenges from "../tasks/clear-expired-passkey-challenges.js";
import clearExpiredPasswordAttempts from "../tasks/clear-expired-password-attempts.js";
import clearExpiredPreviewSessions from "../tasks/clear-expired-preview-sessions.js";
import clearExpiredTokens from "../tasks/clear-expired-tokens.js";
import deleteExpiredDeletedDocuments from "../tasks/delete-expired-deleted-documents.js";
import deleteExpiredDeletedMedia from "../tasks/delete-expired-deleted-media.js";
import deleteExpiredDeletedUsers from "../tasks/delete-expired-deleted-users.js";
import deleteExpiredNotifications from "../tasks/delete-expired-notifications.js";
import deleteExpiredRevisions from "../tasks/delete-expired-revisions.js";
import deleteExpiredUnsyncedMedia from "../tasks/delete-expired-unsynced-media.js";

const tasks = [
	clearExpiredLocales,
	clearExpiredJobs,
	clearExpiredDeployRuns,
	clearExpiredCollections,
	clearExpiredPreviewSessions,
	clearExpiredTokens,
	clearExpiredAuthStates,
	clearExpiredPasskeyChallenges,
	clearExpiredPasswordAttempts,
	clearExpiredOAuthData,
	deleteExpiredUnsyncedMedia,
	deleteExpiredDeletedMedia,
	deleteExpiredDeletedUsers,
	deleteExpiredDeletedDocuments,
	deleteExpiredRevisions,
	deleteExpiredNotifications,
];

const deleteExpiredData: JobService = async ({ context }) => {
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
	key: "core:delete-expired-data",
	version: 1,
	input: z.null(),
	transaction: true,
	schedules: [
		{
			key: "automatic",
			cron: "0 0 * * *",
			timezone: "UTC",
			input: null,
		},
	],
	handler: async (args) => {
		const result = await deleteExpiredData(args);
		if (result.error) throw new LucidError(result.error);
	},
});
