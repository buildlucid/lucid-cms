import deleteCollectionJob from "../../services/collections/jobs/delete-single.js";
import executePublishOperationJob, {
	markPublishOperationJobFailed,
} from "../../services/document-publish-operations/jobs/execute.js";
import deleteDocumentJob from "../../services/documents/jobs/delete-single.js";
import deleteExpiredRevisionsJob from "../../services/documents-versions/jobs/delete-expired-revisions.js";
import sendEmailJob from "../../services/email/jobs/send-email.js";
import deleteLocaleJob from "../../services/locales/jobs/delete-single.js";
import abortUploadSessionJob from "../../services/media/jobs/abort-upload-session.js";
import deleteAwaitingSyncMediaJob from "../../services/media/jobs/delete-awaiting-sync.js";
import hardDeleteSingleMediaJob from "../../services/media/jobs/hard-delete-single.js";
import updateMediaStorageJob from "../../services/media/jobs/update-storage.js";
import deleteUserJob from "../../services/users/jobs/delete-single.js";
import executeAlert from "../alerts/execute-alert.js";
import type { QueueEvent, QueueJobHandler, QueueJobHandlers } from "./types.js";

const jobHandlersMap: Record<QueueEvent, QueueJobHandler> = {
	"alert:execute": executeAlert,
	"email:send": sendEmailJob,
	"media:delete": hardDeleteSingleMediaJob,
	"media:abort-upload-session": abortUploadSessionJob,
	"media:delete-unsynced": deleteAwaitingSyncMediaJob,
	"media:update-storage": updateMediaStorageJob,
	"collections:delete": deleteCollectionJob,
	"locales:delete": deleteLocaleJob,
	"users:delete": deleteUserJob,
	"documents:delete": deleteDocumentJob,
	"document-versions:delete-expired": deleteExpiredRevisionsJob,
	"document-publish-operation:execute": {
		handler: executePublishOperationJob,
		onPermanentFailure: markPublishOperationJobFailed,
	},
};

const getJobHandler = (
	event: QueueEvent,
	additionalHandlers?: QueueJobHandlers,
): QueueJobHandler | undefined => {
	const handler = additionalHandlers?.[event] ?? jobHandlersMap[event];
	return handler;
};

export default getJobHandler;
