import type {
	ColumnDataType,
	ColumnType,
	Generated,
	JSONColumnType,
	Kysely,
	Migration,
	Transaction,
} from "kysely";
import type constants from "../../constants/constants.js";
import type { OptionsName } from "../../schemas/options.js";
import type { BrickTypes } from "../builders/brick-builder/types.js";
import type { MigrationPlan } from "../collection/migration/types.js";
import type { EmailDeliveryStatus, EmailType } from "../email-adapter/types.js";
import type { QueueEvent, QueueJobStatus } from "../queue-adapter/types.js";
import type DatabaseAdapter from "./adapter-base.js";

export type KyselyDB = Kysely<LucidDB> | Transaction<LucidDB>;

export type MigrationFn = (adapter: DatabaseAdapter) => Migration;

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

export type DocumentVersionType = "latest" | "revision" | string;

export type OnDelete = "cascade" | "set null" | "restrict" | "no action";
export type OnUpdate = "cascade" | "set null" | "no action" | "restrict";

export type DatabaseConfig = {
	support: {
		/**
		 * Whether the database supports the ALTER COLUMN statement.
		 */
		alterColumn: boolean;
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
	 * - 'boolean' maps to 'boolean' in PostgreSQL, 'integer' in SQLite
	 * - 'json' maps to 'jsonb' in PostgreSQL, 'json' in SQLite
	 */
	dataTypes: {
		primary: ColumnDataType;
		integer: ColumnDataType;
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
	/**
	 * The operator used for fuzzy text matching.
	 */
	fuzzOperator: "like" | "ilike" | "%";
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

export interface InferredTable {
	name: string;
	columns: InferredColumn[];
}

// ------------------------------------------------------------------------------
// Column types

export type TimestampMutateable = ColumnType<
	string | Date | null,
	string | undefined,
	string | null
>;
export type TimestampImmutable = ColumnType<
	string | Date,
	string | undefined,
	never
>;

/** Should only be used for DB column insert/response values. Everything else should be using booleans and can be converted for response/insert with boolean helpers */
export type BooleanInt = 0 | 1 | boolean;

// ------------------------------------------------------------------------------
// Tables

export interface LucidLocales {
	code: string;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
	is_deleted: ColumnType<BooleanInt, BooleanInt | undefined, BooleanInt>;
	is_deleted_at: TimestampMutateable;
}

export interface LucidOptions {
	name: OptionsName;
	value_int: number | null;
	value_text: string | null;
	value_bool: BooleanInt | null;
}

export interface LucidQueueJobs {
	id: Generated<number>;
	job_id: string;
	event_type: QueueEvent;
	event_data: JSONColumnType<
		Record<string, unknown>,
		Record<string, unknown>,
		Record<string, unknown>
	>;
	queue_adapter_key: string;
	status: QueueJobStatus;
	priority: number | null;
	attempts: number;
	max_attempts: number;
	error_message: string | null;
	created_at: TimestampImmutable;
	scheduled_for: TimestampMutateable;
	started_at: TimestampMutateable;
	completed_at: TimestampMutateable;
	failed_at: TimestampMutateable;
	next_retry_at: TimestampMutateable;
	created_by_user_id: number | null;
	updated_at: TimestampMutateable;
}

export interface LucidUsers {
	id: Generated<number>;
	super_admin: ColumnType<BooleanInt, BooleanInt | undefined, BooleanInt>;
	email: string;
	username: string;
	first_name: string | null;
	last_name: string | null;
	password: ColumnType<string, string | undefined, string>;
	secret: ColumnType<string, string, string>;
	triggered_password_reset: ColumnType<
		BooleanInt,
		BooleanInt | undefined,
		BooleanInt
	>;
	invitation_accepted: ColumnType<
		BooleanInt,
		BooleanInt | undefined,
		BooleanInt
	>;
	is_locked: ColumnType<BooleanInt, BooleanInt | undefined, BooleanInt>;
	is_deleted: BooleanInt | null;
	is_deleted_at: TimestampMutateable;
	deleted_by: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
}

export interface LucidUserAuthProviders {
	id: Generated<number>;
	user_id: number;
	provider_key: string;
	provider_user_id: string;
	linked_at: TimestampImmutable;
	metadata: JSONColumnType<
		Record<string, unknown> | null,
		Record<string, unknown> | null,
		Record<string, unknown> | null
	>;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
}

export interface LucidRoles {
	id: Generated<number>;
	name: string;
	description: string | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
}

export interface LucidRolePermissions {
	id: Generated<number>;
	role_id: number;
	permission: string;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
}

export interface LucidUserRoles {
	id: Generated<number>;
	user_id: number | null;
	role_id: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
}

export type UserTokenType =
	(typeof constants.userTokens)[keyof typeof constants.userTokens];

export interface LucidUserTokens {
	id: Generated<number>;
	user_id: number;
	token_type: UserTokenType;
	token: string;
	created_at: TimestampImmutable;
	expiry_date: TimestampMutateable;
}

export interface LucidUserLogins {
	id: Generated<number>;
	user_id: number | null;
	token_id: number | null;
	auth_method: string;
	ip_address: string | null;
	user_agent: string | null;
	created_at: TimestampImmutable;
}

export interface LucidEmails {
	id: Generated<number>;
	from_address: string;
	from_name: string;
	to_address: string;
	subject: string;
	cc: string | null;
	bcc: string | null;
	template: string;
	data: JSONColumnType<
		Record<string, unknown>,
		//* __insert__ includes a Record as the base repository handles formatting via formatData method
		Record<string, unknown> | null,
		Record<string, unknown> | null
	>;
	type: EmailType;
	current_status: EmailDeliveryStatus;
	attempt_count: number;
	last_attempted_at: TimestampMutateable;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
}

export interface LucidEmailTransactions {
	id: Generated<number>;
	email_id: number;
	delivery_status: EmailDeliveryStatus;
	message: string | null;
	external_message_id: string | null;
	strategy_identifier: string;
	strategy_data: JSONColumnType<
		Record<string, unknown>,
		Record<string, unknown> | null,
		Record<string, unknown> | null
	>;
	simulate: BooleanInt;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
}

export interface LucidMediaFolders {
	id: Generated<number>;
	title: string;
	parent_folder_id: number | null;
	created_by: number | null;
	updated_by: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
}

export interface LucidMedia {
	id: Generated<number>;
	key: string;
	folder_id: number | null;
	e_tag: string | null;
	public: BooleanInt;
	type: string;
	mime_type: string;
	file_extension: string;
	file_size: number;
	width: number | null;
	height: number | null;
	blur_hash: string | null;
	average_color: string | null;
	is_dark: BooleanInt | null;
	is_light: BooleanInt | null;
	custom_meta: string | null;
	is_deleted: ColumnType<BooleanInt, BooleanInt | undefined, BooleanInt>;
	is_deleted_at: TimestampMutateable;
	deleted_by: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
	created_by: number | null;
	updated_by: number | null;
}

export interface LucidMediaShareLinks {
	id: Generated<number>;
	media_id: number;
	token: string;
	password: string | null;
	expires_at: TimestampMutateable;
	name: string | null;
	description: string | null;
	created_by: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
	updated_by: number | null;
}

export interface LucidMediaTranslations {
	id: Generated<number>;
	media_id: number;
	locale_code: string;
	title: string | null;
	alt: string | null;
}

export interface LucidMediaAwaitingSync {
	key: string;
	timestamp: TimestampImmutable;
}

export interface HeadlessProcessedImages {
	key: string;
	media_key: string | null;
	file_size: number;
}

export interface LucidCollections {
	key: string;
	is_deleted: ColumnType<BooleanInt, BooleanInt | undefined, BooleanInt>;
	is_deleted_at: TimestampMutateable;
	created_at: TimestampImmutable;
}

export interface LucidCollectionMigrations {
	id: Generated<number>;
	collection_key: string;
	migration_plans: JSONColumnType<
		MigrationPlan,
		//* __insert__ includes a Record as the base repository handles formatting via formatData method
		MigrationPlan,
		MigrationPlan
	>;
	created_at: TimestampImmutable;
}

export interface LucidClientIntegrations {
	id: Generated<number>;
	name: string;
	description: string | null;
	enabled: BooleanInt;
	key: string;
	api_key: string;
	secret: string;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
}

export type LucidDocumentTableName = `lucid_document__${string}`;
export interface LucidDocumentTable {
	id: Generated<number>;
	collection_key: string;
	is_deleted: BooleanInt;
	is_deleted_at: TimestampMutateable;
	deleted_by: number;
	created_by: number;
	created_at: TimestampImmutable;
	updated_by: number;
	updated_at: TimestampMutateable;
}

export type LucidVersionTableName = `lucid_document__${string}__versions`;
export interface LucidVersionTable {
	id: Generated<number>;
	collection_key: string;
	document_id: number;
	type: DocumentVersionType;
	promoted_from: number | null;
	created_by: number | null;
	updated_by: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
}

export type LucidBrickTableName =
	| `lucid_document__${string}__fields`
	| `lucid_document__${string}__${string}`
	| `lucid_document__${string}__${string}__${string}`;

type CustomFieldColumnName = string; // `_${string}`;
export interface LucidBricksTable {
	id: Generated<number>;
	collection_key: string;
	document_id: number;
	document_version_id: number;
	locale: string;
	position: number;
	is_open: BooleanInt;
	// brick specific
	brick_type?: BrickTypes;
	brick_instance_id?: string;
	// brick and document-field specific
	brick_id_ref?: number;
	// repeater specific
	parent_id?: number | null;
	parent_id_ref?: number | null;
	brick_id?: number;
	// dynamic
	[key: CustomFieldColumnName]: unknown;
}

export type AuthStateActionType =
	(typeof constants.authState.actionTypes)[keyof typeof constants.authState.actionTypes];

export interface LucidAuthStates {
	id: Generated<number>;
	state: string;
	provider_key: string;
	authenticated_user_id: number | null;
	action_type: AuthStateActionType;
	expiry_date: TimestampImmutable;
	redirect_path: string | null;
	invitation_token_id: number | null;
	created_at: TimestampImmutable;
}

// ------------------------------------------------------------------------------
// Database
export interface LucidDB {
	lucid_locales: LucidLocales;
	lucid_options: LucidOptions;
	lucid_users: LucidUsers;
	lucid_roles: LucidRoles;
	lucid_role_permissions: LucidRolePermissions;
	lucid_user_roles: LucidUserRoles;
	lucid_user_tokens: LucidUserTokens;
	lucid_user_logins: LucidUserLogins;
	lucid_user_auth_providers: LucidUserAuthProviders;
	lucid_emails: LucidEmails;
	lucid_email_transactions: LucidEmailTransactions;
	lucid_media_folders: LucidMediaFolders;
	lucid_media: LucidMedia;
	lucid_media_translations: LucidMediaTranslations;
	lucid_media_awaiting_sync: LucidMediaAwaitingSync;
	lucid_media_share_links: LucidMediaShareLinks;
	lucid_processed_images: HeadlessProcessedImages;
	lucid_client_integrations: LucidClientIntegrations;
	lucid_collections: LucidCollections;
	lucid_collection_migrations: LucidCollectionMigrations;
	lucid_queue_jobs: LucidQueueJobs;
	lucid_auth_states: LucidAuthStates;
	[key: LucidDocumentTableName]: LucidDocumentTable;
	// @ts-expect-error
	[key: LucidVersionTableName]: LucidVersionTable;
	// @ts-expect-error
	[key: LucidBrickTableName]: LucidBricksTable;
}
