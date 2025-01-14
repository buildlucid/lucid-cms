import type { Kysely, JSONColumnType, Transaction } from "kysely";
import type { Migration, Generated, ColumnType, ColumnDataType } from "kysely";
import type { FieldTypes } from "../custom-fields/types.js";
import type { OptionName } from "../../types/response.js";
import type { BrickTypes } from "../builders/brick-builder/types.js";
import type DatabaseAdapter from "./adapter.js";
import type { MigrationPlan } from "../../services/collection-migrator/migration/types.js";

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

export type DocumentVersionType = "draft" | "published" | "revision";

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

export interface LucidTranslationKeys {
	id: Generated<number>;
	created_at: TimestampImmutable;
}

export interface LucidTranslations {
	id: Generated<number>;
	translation_key_id: number;
	locale_code: string;
	value: string | null;
}

export interface LucidOptions {
	name: OptionName;
	value_int: number | null;
	value_text: string | null;
	value_bool: BooleanInt | null;
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
	is_deleted: BooleanInt | null;
	is_deleted_at: TimestampMutateable;
	deleted_by: number | null;
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

export interface LucidUserTokens {
	id: Generated<number>;
	user_id: number | null;
	token_type: "password_reset" | "refresh";
	token: string;
	created_at: TimestampImmutable;
	expiry_date: TimestampMutateable;
}

export interface LucidEmails {
	id: Generated<number>;
	email_hash: string;
	from_address: string;
	from_name: string;
	to_address: string;
	subject: string;
	cc: string | null;
	bcc: string | null;
	delivery_status: "pending" | "delivered" | "failed";
	template: string;
	data: JSONColumnType<
		Record<string, unknown>,
		//* __insert__ includes a Record as the base repository handles formatting via formatData method
		Record<string, unknown> | null,
		string | null
	>;
	type: "internal" | "external";
	sent_count: number;
	error_count: number;
	last_error_message: string | null;
	last_attempt_at: TimestampMutateable;
	last_success_at: TimestampMutateable;
	created_at: TimestampImmutable;
}

export interface LucidMedia {
	id: Generated<number>;
	key: string;
	e_tag: string | null;
	visible: BooleanInt;
	type: string;
	mime_type: string;
	file_extension: string;
	file_size: number;
	width: number | null;
	height: number | null;
	blur_hash: string | null;
	average_colour: string | null;
	is_dark: BooleanInt | null;
	is_light: BooleanInt | null;
	custom_meta: string | null;
	title_translation_key_id: number | null;
	alt_translation_key_id: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
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

export interface LucidCollectionDocuments {
	id: Generated<number>;
	collection_key: string;
	is_deleted: ColumnType<BooleanInt, BooleanInt | undefined, BooleanInt>;
	is_deleted_at: TimestampMutateable;
	deleted_by: number | null;
	created_by: number | null;
	updated_by: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
}

export interface LucidCollectionDocumentVersions {
	id: Generated<number>;
	document_id: number;
	version_type: DocumentVersionType;
	promoted_from: number | null;
	created_at: TimestampImmutable;
	created_by: number | null;
}

export interface LucidCollectionDocumentBricks {
	id: Generated<number>;
	collection_document_version_id: number;
	brick_type: BrickTypes;
	brick_key: string | null;
	brick_order: number | null;
	brick_open: BooleanInt | null;
}

export interface LucidCollectionDocumentGroups {
	group_id: Generated<number>;
	collection_document_id: number;
	collection_document_version_id: number;
	collection_brick_id: number;
	parent_group_id: number | null;
	repeater_key: string;
	group_order: number;
	group_open: BooleanInt | null;
	ref: string | null;
}

export interface LucidCollectionDocumentFields {
	fields_id: Generated<number>;
	collection_document_id: number;
	collection_document_version_id: number;
	collection_brick_id: number;
	group_id: number | null;
	locale_code: string;
	key: string;
	type: FieldTypes;
	text_value: string | null;
	int_value: number | null;
	bool_value: BooleanInt | null;
	json_value: JSONColumnType<
		Record<string, unknown>,
		string | null,
		string | null
	>;
	user_id: number | null;
	media_id: number | null;
	document_id: number | null;
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

export interface LucidDocumentTable {
	id: Generated<number>;
	collection_key: string;
	is_deleted: BooleanInt;
	is_deleted_at: TimestampMutateable;
	deleted_by: number;
	created_by: number;
	created_at: TimestampImmutable;
}

export interface LucidVersionTable {
	id: Generated<number>;
	collection_key: string;
	document_id: number;
	type: "draft" | "revision" | "published";
	created_by: number;
	updated_by: number;
	created_at: TimestampImmutable;
	updated_at: TimestampMutateable;
}

export interface LucidFieldsTable {
	id: Generated<number>;
}

export interface LucidRepeaterTable {
	id: Generated<number>;
}

export interface LucidBrickTable {
	id: Generated<number>;
}

// ------------------------------------------------------------------------------
// Database
export interface LucidDB {
	lucid_locales: LucidLocales;
	lucid_translation_keys: LucidTranslationKeys;
	lucid_translations: LucidTranslations;
	lucid_options: LucidOptions;
	lucid_users: LucidUsers;
	lucid_roles: LucidRoles;
	lucid_role_permissions: LucidRolePermissions;
	lucid_user_roles: LucidUserRoles;
	lucid_user_tokens: LucidUserTokens;
	lucid_emails: LucidEmails;
	lucid_media: LucidMedia;
	lucid_media_awaiting_sync: LucidMediaAwaitingSync;
	lucid_processed_images: HeadlessProcessedImages;
	lucid_client_integrations: LucidClientIntegrations;
	lucid_collections: LucidCollections;
	lucid_collection_migrations: LucidCollectionMigrations;
	[key: `lucid_document__${string}`]: LucidDocumentTable;
	// @ts-expect-error
	[key: `lucid_document__${string}__versions`]: LucidVersionTable;
	// TODO: delete bellow
	lucid_collection_documents: LucidCollectionDocuments;
	lucid_collection_document_versions: LucidCollectionDocumentVersions;
	lucid_collection_document_bricks: LucidCollectionDocumentBricks;
	lucid_collection_document_groups: LucidCollectionDocumentGroups;
	lucid_collection_document_fields: LucidCollectionDocumentFields;
}
