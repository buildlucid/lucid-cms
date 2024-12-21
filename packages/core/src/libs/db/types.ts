import type { Kysely, JSONColumnType } from "kysely";
import type { Migration, Generated, ColumnType, ColumnDataType } from "kysely";
import type { FieldTypes } from "../custom-fields/types.js";
import type { OptionName } from "../../types/response.js";
import type { BrickTypes } from "../builders/brick-builder/types.js";
import type { CollectionSchema } from "../../services/collection-migrator/schema/types.js";
import type DatabaseAdapter from "./adapter.js";

export type KyselyDB = Kysely<LucidDB>;

export type MigrationFn = (adapter: DatabaseAdapter) => Migration;

export type Select<T> = {
	[P in keyof T]: T[P] extends { __select__: infer S } ? S : T[P];
};

export type DocumentVersionType = "draft" | "published" | "revision";

export type ColumnTypes =
	| "integer"
	| "text"
	| "timestamp"
	| "json"
	| "boolean"
	| "jsonb"
	| "serial";

export type OnDelete = "CASCADE" | "SET NULL" | "RESTRICT";
export type OnUpdate = "CASCADE" | "SET NULL" | "RESTRICT";

export type DatabaseConfig = {
	dataTypes: {
		serial: ColumnDataType;
		integer: ColumnDataType;
		boolean: ColumnDataType;
		jsonb: ColumnDataType;
		text: ColumnDataType;
		timestamp: ColumnDataType;
		char: ((length: number) => ColumnDataType) | ColumnDataType;
		varchar: ((length?: number) => ColumnDataType) | ColumnDataType;
	};
	defaults: {
		timestamp: string;
		primaryKey: {
			autoIncrement: boolean;
		};
	};
};

// ------------------------------------------------------------------------------
// Column types

export type TimestampMutateable = ColumnType<
	string | Date | null,
	string | undefined,
	string
>;
export type TimestampImmutable = ColumnType<
	string | Date,
	string | undefined,
	never
>;
export type BooleanInt = 0 | 1;
export type JSONString = string;

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
	data: JSONString | null;
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

export interface LucidCollectionSchema {
	id: Generated<number>;
	collection_key: string;
	schema: JSONColumnType<CollectionSchema>;
	checksum: string;
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
	json_value: JSONString | null;
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
	lucid_collection_schema: LucidCollectionSchema;
	lucid_collection_documents: LucidCollectionDocuments;
	lucid_collection_document_versions: LucidCollectionDocumentVersions;
	lucid_collection_document_bricks: LucidCollectionDocumentBricks;
	lucid_collection_document_groups: LucidCollectionDocumentGroups;
	lucid_collection_document_fields: LucidCollectionDocumentFields;
	lucid_client_integrations: LucidClientIntegrations;
}
