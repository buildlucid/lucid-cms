import { aiGenerationsTable } from "./ai-generations.js";
import { alertRecipientsTable } from "./alert-recipients.js";
import { alertsTable } from "./alerts.js";
import { authStatesTable } from "./auth-states.js";
import { collectionMigrationsTable } from "./collection-migrations.js";
import { collectionsTable } from "./collections.js";
import { documentBricksTable } from "./document-bricks.js";
import { documentPublishOperationAssigneesTable } from "./document-publish-operation-assignees.js";
import { documentPublishOperationEventsTable } from "./document-publish-operation-events.js";
import { documentPublishOperationsTable } from "./document-publish-operations.js";
import { documentVersionsTable } from "./document-versions.js";
import { documentWorkflowAssigneesTable } from "./document-workflow-assignees.js";
import { documentWorkflowsTable } from "./document-workflows.js";
import { documentsTable } from "./documents.js";
import { emailAttachmentsTable } from "./email-attachments.js";
import { emailChangeRequestsTable } from "./email-change-requests.js";
import { emailTransactionsTable } from "./email-transactions.js";
import { emailsTable } from "./emails.js";
import { integrationScopesTable } from "./integration-scopes.js";
import { integrationsTable } from "./integrations.js";
import { localesTable } from "./locales.js";
import { lucidRemoteConnectionsTable } from "./lucid-remote-connections.js";
import { mediaTable } from "./media.js";
import { mediaAwaitingSyncTable } from "./media-awaiting-sync.js";
import { mediaFoldersTable } from "./media-folders.js";
import { mediaShareLinksTable } from "./media-share-links.js";
import { mediaTranslationsTable } from "./media-translations.js";
import { mediaUploadSessionsTable } from "./media-upload-sessions.js";
import { oauthAuthorizationCodesTable } from "./oauth-authorization-codes.js";
import { oauthAuthorizationRequestsTable } from "./oauth-authorization-requests.js";
import { oauthClientRedirectUrisTable } from "./oauth-client-redirect-uris.js";
import { oauthClientsTable } from "./oauth-clients.js";
import { oauthGrantScopesTable } from "./oauth-grant-scopes.js";
import { oauthGrantsTable } from "./oauth-grants.js";
import { oauthRefreshTokensTable } from "./oauth-refresh-tokens.js";
import { optionsTable } from "./options.js";
import { previewSessionsTable } from "./preview-sessions.js";
import { processedImagesTable } from "./processed-images.js";
import { queueJobsTable } from "./queue-jobs.js";
import { rolePermissionsTable } from "./role-permissions.js";
import { roleTranslationsTable } from "./role-translations.js";
import { rolesTable } from "./roles.js";
import { securityAuditLogsTable } from "./security-audit-logs.js";
import { userAuthProvidersTable } from "./user-auth-providers.js";
import { userLoginsTable } from "./user-logins.js";
import { userRolesTable } from "./user-roles.js";
import { userTokensTable } from "./user-tokens.js";
import { usersTable } from "./users.js";

export * from "./ai-generations.js";
export * from "./alert-recipients.js";
export * from "./alerts.js";
export * from "./auth-states.js";
export * from "./collection-migrations.js";
export * from "./collections.js";
export * from "./document-bricks.js";
export * from "./document-publish-operation-assignees.js";
export * from "./document-publish-operation-events.js";
export * from "./document-publish-operations.js";
export * from "./document-versions.js";
export * from "./document-workflow-assignees.js";
export * from "./document-workflows.js";
export * from "./documents.js";
export * from "./email-attachments.js";
export * from "./email-change-requests.js";
export * from "./email-transactions.js";
export * from "./emails.js";
export * from "./integration-scopes.js";
export * from "./integrations.js";
export * from "./locales.js";
export * from "./lucid-remote-connections.js";
export * from "./media.js";
export * from "./media-awaiting-sync.js";
export * from "./media-folders.js";
export * from "./media-share-links.js";
export * from "./media-translations.js";
export * from "./media-upload-sessions.js";
export * from "./oauth-authorization-codes.js";
export * from "./oauth-authorization-requests.js";
export * from "./oauth-client-redirect-uris.js";
export * from "./oauth-clients.js";
export * from "./oauth-grant-scopes.js";
export * from "./oauth-grants.js";
export * from "./oauth-refresh-tokens.js";
export * from "./options.js";
export * from "./preview-sessions.js";
export * from "./processed-images.js";
export * from "./queue-jobs.js";
export * from "./role-permissions.js";
export * from "./role-translations.js";
export * from "./roles.js";
export * from "./security-audit-logs.js";
export * from "./user-auth-providers.js";
export * from "./user-logins.js";
export * from "./user-roles.js";
export * from "./user-tokens.js";
export * from "./users.js";

export const coreTableDefinitions = [
	aiGenerationsTable,
	alertRecipientsTable,
	alertsTable,
	authStatesTable,
	collectionMigrationsTable,
	collectionsTable,
	documentBricksTable,
	documentPublishOperationAssigneesTable,
	documentPublishOperationEventsTable,
	documentPublishOperationsTable,
	documentVersionsTable,
	documentWorkflowAssigneesTable,
	documentWorkflowsTable,
	documentsTable,
	emailAttachmentsTable,
	emailChangeRequestsTable,
	emailTransactionsTable,
	emailsTable,
	integrationScopesTable,
	integrationsTable,
	localesTable,
	lucidRemoteConnectionsTable,
	mediaTable,
	mediaAwaitingSyncTable,
	mediaFoldersTable,
	mediaShareLinksTable,
	mediaTranslationsTable,
	mediaUploadSessionsTable,
	oauthAuthorizationCodesTable,
	oauthAuthorizationRequestsTable,
	oauthClientRedirectUrisTable,
	oauthClientsTable,
	oauthGrantScopesTable,
	oauthGrantsTable,
	oauthRefreshTokensTable,
	optionsTable,
	previewSessionsTable,
	processedImagesTable,
	queueJobsTable,
	rolePermissionsTable,
	roleTranslationsTable,
	rolesTable,
	securityAuditLogsTable,
	userAuthProvidersTable,
	userLoginsTable,
	userRolesTable,
	userTokensTable,
	usersTable,
] as const;
