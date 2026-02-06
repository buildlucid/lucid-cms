import { cronServices } from "../../services/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

export type CronJobDefinition = {
	fn: ServiceFn<[], undefined>;
	label: string;
	error: string;
	transaction: boolean;
};

const cronJobsMap = () =>
	({
		"clear-expired-locales": {
			fn: cronServices.clearExpiredLocales,
			label: "Clear expired locales",
			error: T("an_error_occurred_clearing_expired_locales"),
			transaction: true,
		},
		"clear-expired-collections": {
			fn: cronServices.clearExpiredCollections,
			label: "Clear expired collections",
			error: T("an_error_occurred_clearing_expired_collections"),
			transaction: true,
		},
		"clear-expired-tokens": {
			fn: cronServices.clearExpiredTokens,
			label: "Clear expired tokens",
			error: T("an_error_occurred_clearing_expired_tokens"),
			transaction: true,
		},
		"update-media-storage": {
			fn: cronServices.updateMediaStorage,
			label: "Update media storage",
			error: T("an_error_occurred_updating_media_storage"),
			transaction: false,
		},
		"delete-expired-unsynced-media": {
			fn: cronServices.deleteExpiredUnsyncedMedia,
			label: "Delete expired unsynced media",
			error: T("an_error_occurred_deleting_expired_media"),
			transaction: true,
		},
		"delete-expired-deleted-media": {
			fn: cronServices.deleteExpiredDeletedMedia,
			label: "Delete expired deleted media",
			error: T("an_error_occurred_deleting_old_soft_deleted_media"),
			transaction: true,
		},
		"delete-expired-deleted-users": {
			fn: cronServices.deleteExpiredDeletedUsers,
			label: "Delete expired deleted users",
			error: T("an_error_occurred_deleting_old_soft_deleted_users"),
			transaction: true,
		},
		"delete-expired-deleted-documents": {
			fn: cronServices.deleteExpiredDeletedDocuments,
			label: "Delete expired deleted documents",
			error: T("an_error_occurred_deleting_old_soft_deleted_documents"),
			transaction: true,
		},
		"delete-expired-revisions": {
			fn: cronServices.deleteExpiredRevisions,
			label: "Delete expired revisions",
			error: T("an_error_occurred_deleting_expired_revisions"),
			transaction: false,
		},
	}) as const satisfies Record<string, CronJobDefinition>;

export type CronJobKey = keyof ReturnType<typeof cronJobsMap>;

export default cronJobsMap;
