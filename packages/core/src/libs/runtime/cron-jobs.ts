import type constants from "../../constants/constants.js";
import { cronServices } from "../../services/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { serverText } from "../i18n/index.js";
import type { ServerText } from "../i18n/types.js";

export type CronScheduleKey = keyof typeof constants.cronSchedules;

export type CronJobDefinition = {
	fn: ServiceFn<[], undefined>;
	label: string;
	error: ServerText;
	transaction: boolean;
	schedule: CronScheduleKey;
};

const cronJobsMap = () =>
	({
		"clear-expired-locales": {
			fn: cronServices.clearExpiredLocales,
			label: "Clear expired locales",
			error: serverText("core.maintenance.locales.expired.clear.failed"),
			transaction: true,
			schedule: "maintenance",
		},
		"clear-expired-collections": {
			fn: cronServices.clearExpiredCollections,
			label: "Clear expired collections",
			error: serverText("core.maintenance.collections.expired.clear.failed"),
			transaction: true,
			schedule: "maintenance",
		},
		"clear-expired-tokens": {
			fn: cronServices.clearExpiredTokens,
			label: "Clear expired tokens",
			error: serverText("core.maintenance.tokens.expired.clear.failed"),
			transaction: true,
			schedule: "maintenance",
		},
		"clear-expired-auth-states": {
			fn: cronServices.clearExpiredAuthStates,
			label: "Clear expired auth states",
			error: serverText("core.maintenance.auth.states.expired.clear.failed"),
			transaction: true,
			schedule: "maintenance",
		},
		"update-media-storage": {
			fn: cronServices.updateMediaStorage,
			label: "Update media storage",
			error: serverText("core.media.storage.update.failed"),
			transaction: false,
			schedule: "maintenance",
		},
		"check-system-alerts": {
			fn: cronServices.checkSystemAlerts,
			label: "Check system alerts",
			error: serverText("core.alerts.system.check.failed"),
			transaction: false,
			schedule: "maintenance",
		},
		"delete-expired-unsynced-media": {
			fn: cronServices.deleteExpiredUnsyncedMedia,
			label: "Delete expired unsynced media",
			error: serverText("core.maintenance.media.expired.delete.failed"),
			transaction: true,
			schedule: "maintenance",
		},
		"delete-expired-deleted-media": {
			fn: cronServices.deleteExpiredDeletedMedia,
			label: "Delete expired deleted media",
			error: serverText("core.maintenance.media.soft.deleted.delete.failed"),
			transaction: true,
			schedule: "maintenance",
		},
		"delete-expired-deleted-users": {
			fn: cronServices.deleteExpiredDeletedUsers,
			label: "Delete expired deleted users",
			error: serverText("core.maintenance.users.soft.deleted.delete.failed"),
			transaction: true,
			schedule: "maintenance",
		},
		"delete-expired-deleted-documents": {
			fn: cronServices.deleteExpiredDeletedDocuments,
			label: "Delete expired deleted documents",
			error: serverText(
				"core.maintenance.documents.soft.deleted.delete.failed",
			),
			transaction: true,
			schedule: "maintenance",
		},
		"delete-expired-revisions": {
			fn: cronServices.deleteExpiredRevisions,
			label: "Delete expired revisions",
			error: serverText("core.maintenance.revisions.expired.delete.failed"),
			transaction: false,
			schedule: "maintenance",
		},
		"dispatch-scheduled-publish-operations": {
			fn: cronServices.dispatchScheduledPublishOperations,
			label: "Dispatch scheduled publish operations",
			error: serverText("core.publish.operations.scheduled.dispatch.failed"),
			transaction: false,
			schedule: "scheduledPublishing",
		},
		"verify-license": {
			fn: cronServices.verifyLicense,
			label: "Verify license",
			error: serverText("core.license.verification.failed"),
			transaction: true,
			schedule: "maintenance",
		},
	}) as const satisfies Record<string, CronJobDefinition>;

export type CronJobKey = keyof ReturnType<typeof cronJobsMap>;

export default cronJobsMap;
