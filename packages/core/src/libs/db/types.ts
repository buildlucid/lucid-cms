import type { ColumnDataType, ColumnType, Kysely, Transaction } from "kysely";
import type { Migration } from "kysely/migration";
import type { ServiceContext } from "../../utils/services/types.js";
import type DatabaseAdapter from "./adapter-base.js";
import type {
	LucidAiGenerations,
	LucidAlertRecipients,
	LucidAlerts,
	LucidAuthStates,
	LucidBricksTable,
	LucidBrickTableName,
	LucidCollectionMigrations,
	LucidCollections,
	LucidDocumentPublishOperationAssignees,
	LucidDocumentPublishOperationEvents,
	LucidDocumentPublishOperations,
	LucidDocumentTable,
	LucidDocumentTableName,
	LucidDocumentWorkflowAssignees,
	LucidDocumentWorkflows,
	LucidEmailAttachments,
	LucidEmailChangeRequests,
	LucidEmails,
	LucidEmailTransactions,
	LucidIntegrationScopes,
	LucidIntegrations,
	LucidLocales,
	LucidMedia,
	LucidMediaAwaitingSync,
	LucidMediaFolders,
	LucidMediaShareLinks,
	LucidMediaTranslations,
	LucidMediaUploadSessions,
	LucidOAuthAuthorizationCodes,
	LucidOAuthAuthorizationRequests,
	LucidOAuthClientRedirectUris,
	LucidOAuthClients,
	LucidOAuthGrantScopes,
	LucidOAuthGrants,
	LucidOAuthRefreshTokens,
	LucidOptions,
	LucidPreviewSessions,
	LucidProcessedImages,
	LucidQueueJobs,
	LucidRemoteConnections,
	LucidRolePermissions,
	LucidRoles,
	LucidRoleTranslations,
	LucidSecurityAuditLogs,
	LucidUserAuthProviders,
	LucidUserLogins,
	LucidUserRoles,
	LucidUsers,
	LucidUserTokens,
	LucidVersionTable,
	LucidVersionTableName,
} from "./tables/index.js";

export type TimestampMutable = ColumnType<
	string | Date | null,
	string | undefined,
	string | null
>;

export type TimestampImmutable = ColumnType<
	string | Date,
	string | undefined,
	never
>;

export type BooleanInt = 0 | 1 | boolean;

export type KyselyDB = Kysely<LucidDB> | Transaction<LucidDB>;
export type DatabaseConnection = {
	/** Live Kysely client owned by one runtime or invocation scope. */
	client: Kysely<LucidDB>;
	/** Optional driver-native resource used by adapter-specific maintenance tasks. */
	native?: unknown;
	/** Releases every resource owned by this connection. */
	destroy: () => Promise<void>;
};
export type MigrationFn = (adapter: DatabaseAdapter) => Migration;
export type ExternalMigration = {
	up: (context: ServiceContext) => Promise<void>;
	down?: (context: ServiceContext) => Promise<void>;
};
export type MigrationSource =
	| string
	| URL
	| { name: string; migration: ExternalMigration };

export type DatabaseMigrationStatus = {
	registered: string[];
	executed: string[];
	pendingCore: string[];
	pendingExternal: string[];
	missing: string[];
};

export type Select<T> = {
	[P in keyof T]: T[P] extends { __select__: infer S } ? S : T[P];
};

export type Insert<T> = {
	[P in keyof T]: T[P] extends { __insert__: infer S } ? S : T[P];
};

export type Update<T> = {
	[P in keyof T]: T[P] extends { __update__: infer S } ? S : T[P];
};

export type DefaultValueType<T> = T extends object
	? keyof T extends never
		? T
		: { [K in keyof T]: T[K] }
	: T;

export type OnDelete = "cascade" | "set null" | "restrict" | "no action";
export type OnUpdate = "cascade" | "set null" | "no action" | "restrict";

export type DatabaseConfig = {
	/**
	 * Maximum allowed table-name length in bytes for this database.
	 * - `null` means no explicit limit is enforced.
	 */
	tableNameByteLimit: number | null;
	support: {
		/**
		 * Whether the database supports the ALTER COLUMN statement.
		 */
		alterColumn: boolean;
		/**
		 * Whether the database supports transactions.
		 */
		transaction: boolean;
		/**
		 * Whether multiple columns can be altered in a single ALTER TABLE statement.
		 * Some databases require separate statements for each column modification.
		 */
		multipleAlterTables: boolean;
		/**
		 * Set to true if the database supports boolean column data types.
		 * If you're database doesnt, booleans are stored as integers as either 1 or 0.
		 */
		boolean: boolean;
		/**
		 * Determines if a primary key colum needs auto increment.
		 */
		autoIncrement: boolean;
	};
	/**
	 * Maps column data types to their database-specific implementations.
	 * Each adapter maps these standard types to what their database supports:
	 *
	 * Examples:
	 * - 'primary' maps to 'serial' in PostgreSQL, 'integer' in SQLite (with autoincrement)
	 * - 'real' maps to 'double precision' in PostgreSQL, 'real' in SQLite
	 * - 'boolean' maps to 'boolean' in PostgreSQL, 'integer' in SQLite
	 * - 'json' maps to 'jsonb' in PostgreSQL, 'json' in SQLite
	 */
	dataTypes: {
		primary: ColumnDataType;
		integer: ColumnDataType;
		real: ColumnDataType;
		boolean: ColumnDataType;
		json: ColumnDataType;
		text: ColumnDataType;
		timestamp: ColumnDataType;
		char: ((length: number) => ColumnDataType) | ColumnDataType;
		varchar: ((length?: number) => ColumnDataType) | ColumnDataType;
	};
	/**
	 * Maps column default values to their database-specific implementations.
	 * Each adapter maps these values to what their database supports:
	 *
	 * Examples:
	 * - 'timestamp.now' maps to 'NOW()' in PostgreSQL and 'CURRENT_TIMESTAMP' in SQLite
	 * - 'boolean.true' maps to 'true' in PostgreSQL and '1' in SQLite
	 *
	 * Remember that the values used here should reflect the column dataTypes as well as database support.
	 */
	defaults: {
		timestamp: {
			now: string;
		};
		boolean: {
			true: true | 1;
			false: false | 0;
		};
	};
	/** The adapter's native case-insensitive SQL pattern operator. */
	caseInsensitiveLikeOperator: "like" | "ilike";
};

export interface InferredColumn {
	name: string;
	type: ColumnDataType;
	nullable: boolean;
	default: unknown | null;
	unique?: boolean;
	primary?: boolean;
	foreignKey?: {
		table: string;
		column: string;
		onDelete?: OnDelete;
		onUpdate?: OnUpdate;
	};
}
export interface InferredIndex {
	name: string;
	columns: string[];
	unique?: boolean;
}

export interface InferredTable {
	name: string;
	columns: InferredColumn[];
	indexes?: InferredIndex[];
}

// ------------------------------------------------------------------------------
// Database
export interface LucidDB {
	lucid_locales: LucidLocales;
	lucid_options: LucidOptions;
	lucid_users: LucidUsers;
	lucid_roles: LucidRoles;
	lucid_role_translations: LucidRoleTranslations;
	lucid_role_permissions: LucidRolePermissions;
	lucid_user_roles: LucidUserRoles;
	lucid_user_tokens: LucidUserTokens;
	lucid_email_change_requests: LucidEmailChangeRequests;
	lucid_user_logins: LucidUserLogins;
	lucid_user_auth_providers: LucidUserAuthProviders;
	lucid_security_audit_logs: LucidSecurityAuditLogs;
	lucid_emails: LucidEmails;
	lucid_email_attachments: LucidEmailAttachments;
	lucid_email_transactions: LucidEmailTransactions;
	lucid_alerts: LucidAlerts;
	lucid_alert_recipients: LucidAlertRecipients;
	lucid_document_publish_operations: LucidDocumentPublishOperations;
	lucid_document_publish_operation_assignees: LucidDocumentPublishOperationAssignees;
	lucid_document_publish_operation_events: LucidDocumentPublishOperationEvents;
	lucid_document_workflows: LucidDocumentWorkflows;
	lucid_document_workflow_assignees: LucidDocumentWorkflowAssignees;
	lucid_preview_sessions: LucidPreviewSessions;
	lucid_remote_connections: LucidRemoteConnections;
	lucid_media_folders: LucidMediaFolders;
	lucid_media: LucidMedia;
	lucid_media_translations: LucidMediaTranslations;
	lucid_media_awaiting_sync: LucidMediaAwaitingSync;
	lucid_media_upload_sessions: LucidMediaUploadSessions;
	lucid_media_share_links: LucidMediaShareLinks;
	lucid_processed_images: LucidProcessedImages;
	lucid_integrations: LucidIntegrations;
	lucid_integration_scopes: LucidIntegrationScopes;
	lucid_oauth_clients: LucidOAuthClients;
	lucid_oauth_client_redirect_uris: LucidOAuthClientRedirectUris;
	lucid_oauth_authorization_requests: LucidOAuthAuthorizationRequests;
	lucid_oauth_grants: LucidOAuthGrants;
	lucid_oauth_grant_scopes: LucidOAuthGrantScopes;
	lucid_oauth_authorization_codes: LucidOAuthAuthorizationCodes;
	lucid_oauth_refresh_tokens: LucidOAuthRefreshTokens;
	lucid_collections: LucidCollections;
	lucid_collection_migrations: LucidCollectionMigrations;
	lucid_queue_jobs: LucidQueueJobs;
	lucid_ai_generations: LucidAiGenerations;
	lucid_auth_states: LucidAuthStates;
	[key: LucidDocumentTableName]: LucidDocumentTable;
	// @ts-expect-error
	[key: LucidVersionTableName]: LucidVersionTable;
	// @ts-expect-error
	[key: LucidBrickTableName]: LucidBricksTable;
}
