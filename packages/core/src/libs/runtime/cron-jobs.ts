import type constants from "../../constants/constants.js";
import { cronServices } from "../../services/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { text } from "../i18n/index.js";
import type { ServerTextDescriptor } from "../i18n/types.js";

export type CronScheduleKey = keyof typeof constants.cronSchedules;

export type CronJobDefinition = {
	fn: ServiceFn<[], undefined>;
	label: string;
	error: ServerTextDescriptor;
	transaction: boolean;
	schedule: CronScheduleKey;
};

const cronJobsMap = () =>
	({
		"clear-expired-locales": {
			fn: cronServices.clearExpiredLocales,
			label: "Clear expired locales",
			error: text.server("core.maintenance.locales.expired.clear.failed"),
			transaction: true,
			schedule: "maintenance",
		},
		"clear-expired-collections": {
			fn: cronServices.clearExpiredCollections,
			label: "Clear expired collections",
			error: text.server("core.maintenance.collections.expired.clear.failed"),
			transaction: true,
			schedule: "maintenance",
		},
		"clear-expired-tokens": {
			fn: cronServices.clearExpiredTokens,
			label: "Clear expired tokens",
			error: text.server("core.maintenance.tokens.expired.clear.failed"),
			transaction: true,
			schedule: "maintenance",
		},
		"clear-expired-auth-states": {
			fn: cronServices.clearExpiredAuthStates,
			label: "Clear expired auth states",
			error: text.server("core.maintenance.auth.states.expired.clear.failed"),
			transaction: true,
			schedule: "maintenance",
		},
		"update-media-storage": {
			fn: cronServices.updateMediaStorage,
			label: "Update media storage",
			error: text.server("core.media.storage.update.failed"),
			transaction: false,
			schedule: "maintenance",
		},
		"check-system-alerts": {
			fn: cronServices.checkSystemAlerts,
			label: "Check system alerts",
			error: text.server("core.alerts.system.check.failed"),
			transaction: false,
			schedule: "maintenance",
		},
		"delete-expired-unsynced-media": {
			fn: cronServices.deleteExpiredUnsyncedMedia,
			label: "Delete expired unsynced media",
			error: text.server("core.maintenance.media.expired.delete.failed"),
			transaction: true,
			schedule: "maintenance",
		},
		"delete-expired-deleted-media": {
			fn: cronServices.deleteExpiredDeletedMedia,
			label: "Delete expired deleted media",
			error: text.server("core.maintenance.media.soft.deleted.delete.failed"),
			transaction: true,
			schedule: "maintenance",
		},
		"delete-expired-deleted-users": {
			fn: cronServices.deleteExpiredDeletedUsers,
			label: "Delete expired deleted users",
			error: text.server("core.maintenance.users.soft.deleted.delete.failed"),
			transaction: true,
			schedule: "maintenance",
		},
		"delete-expired-deleted-documents": {
			fn: cronServices.deleteExpiredDeletedDocuments,
			label: "Delete expired deleted documents",
			error: text.server(
				"core.maintenance.documents.soft.deleted.delete.failed",
			),
			transaction: true,
			schedule: "maintenance",
		},
		"delete-expired-revisions": {
			fn: cronServices.deleteExpiredRevisions,
			label: "Delete expired revisions",
			error: text.server("core.maintenance.revisions.expired.delete.failed"),
			transaction: false,
			schedule: "maintenance",
		},
		"dispatch-scheduled-publish-operations": {
			fn: cronServices.dispatchScheduledPublishOperations,
			label: "Dispatch scheduled publish operations",
			error: text.server("core.publish.operations.scheduled.dispatch.failed"),
			transaction: false,
			schedule: "scheduledPublishing",
		},
		"verify-license": {
			fn: cronServices.verifyLicense,
			label: "Verify license",
			error: text.server("core.license.verification.failed"),
			transaction: true,
			schedule: "maintenance",
		},
	}) as const satisfies Record<string, CronJobDefinition>;

export type CronJobKey = keyof ReturnType<typeof cronJobsMap>;

export default cronJobsMap;
