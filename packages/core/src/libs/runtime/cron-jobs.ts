import type constants from "../../constants/constants.js";
import { cronServices } from "../../services/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

export type CronScheduleKey = keyof typeof constants.cronSchedules;

export type CronJobDefinition = {
	fn: ServiceFn<[], undefined>;
	label: string;
	error: string;
	transaction: boolean;
	schedule: CronScheduleKey;
};

const cronJobsMap = () =>
	({
		"clear-expired-locales": {
			fn: cronServices.clearExpiredLocales,
			label: "Clear expired locales",
			error: T("an_error_occurred_clearing_expired_locales"),
			transaction: true,
			schedule: "maintenance",
		},
		"clear-expired-collections": {
			fn: cronServices.clearExpiredCollections,
			label: "Clear expired collections",
			error: T("an_error_occurred_clearing_expired_collections"),
			transaction: true,
			schedule: "maintenance",
		},
		"clear-expired-tokens": {
			fn: cronServices.clearExpiredTokens,
			label: "Clear expired tokens",
			error: T("an_error_occurred_clearing_expired_tokens"),
			transaction: true,
			schedule: "maintenance",
		},
		"clear-expired-auth-states": {
			fn: cronServices.clearExpiredAuthStates,
			label: "Clear expired auth states",
			error: T("an_error_occurred_clearing_expired_auth_states"),
			transaction: true,
			schedule: "maintenance",
		},
		"update-media-storage": {
			fn: cronServices.updateMediaStorage,
			label: "Update media storage",
			error: T("an_error_occurred_updating_media_storage"),
			transaction: false,
			schedule: "maintenance",
		},
		"check-system-alerts": {
			fn: cronServices.checkSystemAlerts,
			label: "Check system alerts",
			error: T("an_error_occurred_checking_system_alerts"),
			transaction: false,
			schedule: "maintenance",
		},
		"delete-expired-unsynced-media": {
			fn: cronServices.deleteExpiredUnsyncedMedia,
			label: "Delete expired unsynced media",
			error: T("an_error_occurred_deleting_expired_media"),
			transaction: true,
			schedule: "maintenance",
		},
		"delete-expired-deleted-media": {
			fn: cronServices.deleteExpiredDeletedMedia,
			label: "Delete expired deleted media",
			error: T("an_error_occurred_deleting_old_soft_deleted_media"),
			transaction: true,
			schedule: "maintenance",
		},
		"delete-expired-deleted-users": {
			fn: cronServices.deleteExpiredDeletedUsers,
			label: "Delete expired deleted users",
			error: T("an_error_occurred_deleting_old_soft_deleted_users"),
			transaction: true,
			schedule: "maintenance",
		},
		"delete-expired-deleted-documents": {
			fn: cronServices.deleteExpiredDeletedDocuments,
			label: "Delete expired deleted documents",
			error: T("an_error_occurred_deleting_old_soft_deleted_documents"),
			transaction: true,
			schedule: "maintenance",
		},
		"delete-expired-revisions": {
			fn: cronServices.deleteExpiredRevisions,
			label: "Delete expired revisions",
			error: T("an_error_occurred_deleting_expired_revisions"),
			transaction: false,
			schedule: "maintenance",
		},
		"dispatch-scheduled-publish-operations": {
			fn: cronServices.dispatchScheduledPublishOperations,
			label: "Dispatch scheduled publish operations",
			error: T("an_error_occurred_dispatching_scheduled_publish_operations"),
			transaction: false,
			schedule: "scheduledPublishing",
		},
		"verify-license": {
			fn: cronServices.verifyLicense,
			label: "Verify license",
			error: T("license_verification_failed"),
			transaction: true,
			schedule: "maintenance",
		},
	}) as const satisfies Record<string, CronJobDefinition>;

export type CronJobKey = keyof ReturnType<typeof cronJobsMap>;

export default cronJobsMap;
