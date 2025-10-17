import deleteCollectionJob from "../../services/collections/jobs/delete-single.js";
import deleteDocumentJob from "../../services/documents/jobs/delete-single.js";
import sendEmailJob from "../../services/email/jobs/send-email.js";
import deleteLocaleJob from "../../services/locales/jobs/delete-single.js";
import deleteAwaitingSyncMediaJob from "../../services/media/jobs/delete-awaiting-sync.js";
import hardDeleteSingleMediaJob from "../../services/media/jobs/hard-delete-single.js";
import updateMediaStorageJob from "../../services/media/jobs/update-storage.js";
import deleteTokenJob from "../../services/user-tokens/jobs/delete-single.js";
import deleteUserJob from "../../services/users/jobs/delete-single.js";
import type {
	QueueJobHandlerFn,
	QueueEvent,
	QueueJobHandlers,
} from "./types.js";

const jobHandlersMap: Record<QueueEvent, QueueJobHandlerFn> = {
	"email:send": sendEmailJob,
	"media:delete": hardDeleteSingleMediaJob,
	"media:delete-unsynced": deleteAwaitingSyncMediaJob,
	"media:update-storage": updateMediaStorageJob,
	"collections:delete": deleteCollectionJob,
	"locales:delete": deleteLocaleJob,
	"user-tokens:delete": deleteTokenJob,
	"users:delete": deleteUserJob,
	"documents:delete": deleteDocumentJob,
};

const getJobHandler = (
	event: QueueEvent,
	additionalHandlers?: QueueJobHandlers,
): QueueJobHandlerFn | undefined => {
	const handler = additionalHandlers?.[event] ?? jobHandlersMap[event];
	return handler;
};

export default getJobHandler;
