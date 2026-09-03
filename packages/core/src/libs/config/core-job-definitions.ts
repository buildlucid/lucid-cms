import { deleteCollectionJob } from "../../services/collections/jobs/delete-single.js";
import { verifyConnectionsJob } from "../../services/connection/jobs/verify-connections.js";
import { dispatchScheduledPublishOperationsJob } from "../../services/document-publish-operations/jobs/dispatch-scheduled.js";
import { executePublishOperationJob } from "../../services/document-publish-operations/jobs/execute.js";
import { deleteDocumentJob } from "../../services/documents/jobs/delete-single.js";
import { deleteExpiredRevisionsJob } from "../../services/documents-versions/jobs/delete-expired-revisions.js";
import { sendEmailJob } from "../../services/email/jobs/send-email.js";
import { deleteLocaleJob } from "../../services/locales/jobs/delete-single.js";
import { deleteExpiredDataJob } from "../../services/maintenance/jobs/delete-expired-data.js";
import { abortUploadSessionJob } from "../../services/media/jobs/abort-upload-session.js";
import { deleteAwaitingSyncMediaJob } from "../../services/media/jobs/delete-awaiting-sync.js";
import { hardDeleteSingleMediaJob } from "../../services/media/jobs/hard-delete-single.js";
import { updateMediaStorageJob } from "../../services/media/jobs/update-storage.js";
import { deleteUserJob } from "../../services/users/jobs/delete-single.js";
import { checkSystemAlertsJob } from "../alerts/check-system-alerts.js";
import { executeAlertJob } from "../alerts/execute-alert.js";
import type { AnyJobDefinition } from "../jobs/types.js";

/** Job definitions Lucid registers before the project and plugin definitions. */
const coreJobDefinitions = [
	executeAlertJob,
	checkSystemAlertsJob,
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
	dispatchScheduledPublishOperationsJob,
	deleteExpiredDataJob,
	verifyConnectionsJob,
] as const satisfies readonly AnyJobDefinition[];

export default coreJobDefinitions;
