import { executeAgentRunJob } from "../../services/agent/jobs/execute-run.js";
import { generateAgentTitleJob } from "../../services/agent/jobs/generate-title.js";
import { syncAnnouncementsJob } from "../../services/announcements/jobs/sync-announcements.js";
import { deleteCollectionJob } from "../../services/collections/jobs/delete-single.js";
import { verifyConnectionsJob } from "../../services/connection/jobs/verify-connections.js";
import { deleteExpiredRevisionsJob } from "../../services/documents-versions/jobs/delete-expired-revisions.js";
import { deleteDocumentJob } from "../../services/documents/jobs/delete-single.js";
import { sendEmailJob } from "../../services/email/jobs/send-email.js";
import { deleteLocaleJob } from "../../services/locales/jobs/delete-single.js";
import { deleteExpiredDataJob } from "../../services/maintenance/jobs/delete-expired-data.js";
import { abortUploadSessionJob } from "../../services/media/jobs/abort-upload-session.js";
import { checkStorageJob } from "../../services/media/jobs/check-storage.js";
import { deleteAwaitingSyncMediaJob } from "../../services/media/jobs/delete-awaiting-sync.js";
import { hardDeleteSingleMediaJob } from "../../services/media/jobs/hard-delete-single.js";
import { updateMediaStorageJob } from "../../services/media/jobs/update-storage.js";
import { sendNotificationEmailsJob } from "../../services/notifications/jobs/send-emails.js";
import { executeRequestJob } from "../../services/requests/jobs/execute.js";
import { translateDocumentsJob } from "../../services/translations/jobs/translate.js";
import { deleteUserJob } from "../../services/users/jobs/delete-single.js";
import type { AnyJobDefinition } from "../jobs/types.js";

/** Job definitions Lucid registers before the project and plugin definitions. */
const coreJobDefinitions = [
	sendEmailJob,
	sendNotificationEmailsJob,
	checkStorageJob,
	hardDeleteSingleMediaJob,
	abortUploadSessionJob,
	deleteAwaitingSyncMediaJob,
	updateMediaStorageJob,
	deleteCollectionJob,
	deleteLocaleJob,
	deleteUserJob,
	deleteDocumentJob,
	deleteExpiredRevisionsJob,
	executeRequestJob,
	translateDocumentsJob,
	deleteExpiredDataJob,
	verifyConnectionsJob,
	syncAnnouncementsJob,
	executeAgentRunJob,
	generateAgentTitleJob,
] as const satisfies readonly AnyJobDefinition[];

export default coreJobDefinitions;
