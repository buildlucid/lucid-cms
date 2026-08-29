import { deleteCollectionJob } from "../../../services/collections/jobs/delete-single.js";
import { executePublishOperationJob } from "../../../services/document-publish-operations/jobs/execute.js";
import { deleteDocumentJob } from "../../../services/documents/jobs/delete-single.js";
import { deleteExpiredRevisionsJob } from "../../../services/documents-versions/jobs/delete-expired-revisions.js";
import { sendEmailJob } from "../../../services/email/jobs/send-email.js";
import { deleteLocaleJob } from "../../../services/locales/jobs/delete-single.js";
import { abortUploadSessionJob } from "../../../services/media/jobs/abort-upload-session.js";
import { deleteAwaitingSyncMediaJob } from "../../../services/media/jobs/delete-awaiting-sync.js";
import { hardDeleteSingleMediaJob } from "../../../services/media/jobs/hard-delete-single.js";
import { updateMediaStorageJob } from "../../../services/media/jobs/update-storage.js";
import { deleteUserJob } from "../../../services/users/jobs/delete-single.js";
import { executeAlertJob } from "../../alerts/execute-alert.js";
import type { AnyJobDefinition } from "../types.js";

const coreJobs = [
	executeAlertJob,
	sendEmailJob,
	hardDeleteSingleMediaJob,
	abortUploadSessionJob,
	deleteAwaitingSyncMediaJob,
	updateMediaStorageJob,
	deleteCollectionJob,
	deleteLocaleJob,
	deleteUserJob,
	deleteDocumentJob,
	deleteExpiredRevisionsJob,
	executePublishOperationJob,
] as const satisfies readonly AnyJobDefinition[];

export default coreJobs;
