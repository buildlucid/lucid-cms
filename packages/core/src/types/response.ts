import type { BooleanInt, DocumentVersionType } from "../libs/db/types.js";
import type { CollectionBrickConfig } from "../libs/builders/collection-builder/types.js";
import type { ErrorResult } from "./errors.js";
import type {
	CFConfig,
	FieldTypes,
	FieldResponseMeta,
	FieldResponseValue,
} from "../libs/custom-fields/types.js";
import type { BrickTypes } from "../libs/builders/brick-builder/types.js";

export interface UserResponse {
	id: number;
	superAdmin?: BooleanInt;
	email: string;
	username: string;
	firstName: string | null;
	lastName: string | null;
	triggerPasswordReset?: BooleanInt;

	roles?: UserPermissionsResponse["roles"];
	permissions?: UserPermissionsResponse["permissions"];

	createdAt: string | null;
	updatedAt?: string | null;
}

export interface UserPermissionsResponse {
	roles: Array<{
		id: number;
		name: string;
	}>;
	permissions: Permission[];
}

export interface SettingsResponse {
	email: {
		enabled: boolean;
		from: {
			email: string;
			name: string;
		} | null;
	};
	media: {
		enabled: boolean;
		storage: {
			total: number;
			remaining: number | null;
			used: number | null;
			limit: number;
		};
		processed: {
			stored: boolean;
			imageLimit: number;
			total: number | null;
		};
	};
}

export interface RoleResponse {
	id: number;
	name: string;
	description: string | null;

	permissions?: {
		id: number;
		permission: Permission;
	}[];

	createdAt: string | null;
	updatedAt: string | null;
}

export type OptionName = "media_storage_used";

export interface OptionsResponse {
	name: OptionName;
	valueText: string | null;
	valueInt: number | null;
	valueBool: BooleanInt | null;
}

export type MediaType =
	| "image"
	| "video"
	| "audio"
	| "document"
	| "archive"
	| "unknown";

export interface MediaResponse {
	id: number;
	key: string;
	url: string;
	title: {
		localeCode: string | null;
		value: string | null;
	}[];
	alt: {
		localeCode: string | null;
		value: string | null;
	}[];
	type: MediaType;
	meta: {
		mimeType: string;
		extension: string;
		fileSize: number;
		width: number | null;
		height: number | null;
		blurHash: string | null;
		averageColour: string | null;
		isDark: BooleanInt | null;
		isLight: BooleanInt | null;
	};
	createdAt: string | null;
	updatedAt: string | null;
}

export interface LocalesResponse {
	code: string;
	name: string | null;
	isDefault: BooleanInt;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface EmailResponse {
	id: number;
	mailDetails: {
		from: {
			address: string;
			name: string;
		};
		to: string;
		subject: string;
		cc: null | string;
		bcc: null | string;
		template: string;
	};
	data: Record<string, unknown> | null;
	deliveryStatus: "sent" | "failed" | "pending";
	type: "external" | "internal";
	emailHash: string;
	sentCount: number;
	errorCount: number;
	html: string | null;
	errorMessage: string | null;

	createdAt: string | null;
	lastSuccessAt: string | null;
	lastAttemptAt: string | null;
}

export interface CollectionResponse {
	key: string;
	mode: "single" | "multiple";
	title: string;
	singular: string;
	description: string | null;
	documentId?: number | null;
	useTranslations: boolean;
	useDrafts: boolean;
	useRevisions: boolean;
	isLocked: boolean;
	fixedBricks: Array<CollectionBrickConfig>;
	builderBricks: Array<CollectionBrickConfig>;
	fields: CFConfig<FieldTypes>[];
	fieldIncludes: string[];
	fieldFilters: string[];
}

export interface BrickResponse {
	id: number;
	key: string;
	order: number;
	open: BooleanInt | null;
	type: "builder" | "fixed";
	fields: Array<FieldResponse>;
}
export interface BrickAltResponse {
	id: number;
	key: string;
	order: number;
	open: BooleanInt | null;
	type: "builder" | "fixed";
	fields: Record<string, FieldAltResponse>;
}

export interface FieldResponse {
	key: string;
	type: FieldTypes;
	groupId?: number;
	translations?: Record<string, FieldResponseValue>;
	value?: FieldResponseValue;
	meta?: Record<string, FieldResponseMeta> | FieldResponseMeta;
	groups?: Array<FieldGroupResponse>;
}
export interface FieldAltResponse {
	key: string;
	type: FieldTypes;
	groupId?: number;
	translations?: Record<string, FieldResponseValue>;
	value?: FieldResponseValue;
	meta?: Record<string, FieldResponseMeta> | FieldResponseMeta;
	groups?: Array<FieldGroupAltResponse>;
}
export interface FieldGroupResponse {
	id: number | string;
	order: number;
	open: BooleanInt | null;
	fields: Array<FieldResponse>;
}
export interface FieldGroupAltResponse {
	id: number | string;
	order: number;
	open: BooleanInt | null;
	fields: Record<string, FieldAltResponse>;
}

export interface CollectionDocumentVersionResponse {
	id: number;
	versionType: DocumentVersionType;
	promotedFrom: number | null;
	createdAt: string | null;
	createdBy: number | null;
	document: {
		id: number | null;
		collectionKey: string | null;
		createdBy: number | null;
		createdAt: string | null;
		updatedAt: string | null;
		updatedBy: number | null;
	};
	bricks: Record<
		Partial<BrickTypes>,
		Array<{
			id: number;
			brickKey: string | null;
			fields: number;
		}>
	>;
}

export interface CollectionDocumentResponse {
	id: number;
	collectionKey: string | null;
	status: DocumentVersionType | null;
	versionId: number | null;
	version: {
		draft: {
			id: number | null;
			promotedFrom: number | null;
			createdAt: string | null;
			createdBy: number | null;
		} | null;
		published: {
			id: number | null;
			promotedFrom: number | null;
			createdAt: string | null;
			createdBy: number | null;
		} | null;
	};
	createdBy: {
		id: number;
		email: string | null;
		firstName: string | null;
		lastName: string | null;
		username: string | null;
	} | null;
	createdAt: string | null;
	updatedAt: string | null;
	updatedBy: {
		id: number;
		email: string | null;
		firstName: string | null;
		lastName: string | null;
		username: string | null;
	} | null;

	bricks?: Array<BrickResponse> | null;
	fields?: Array<FieldResponse> | null;
}
export interface ClientDocumentResponse {
	id: number;
	collectionKey: string | null;
	status: DocumentVersionType | null;
	version: {
		draft: {
			id: number | null;
			promotedFrom: number | null;
			createdAt: string | null;
			createdBy: number | null;
		} | null;
		published: {
			id: number | null;
			promotedFrom: number | null;
			createdAt: string | null;
			createdBy: number | null;
		} | null;
	};
	createdBy: {
		id: number;
		email: string | null;
		firstName: string | null;
		lastName: string | null;
		username: string | null;
	} | null;
	createdAt: string | null;
	updatedAt: string | null;
	updatedBy: {
		id: number;
		email: string | null;
		firstName: string | null;
		lastName: string | null;
		username: string | null;
	} | null;

	bricks?: Array<BrickAltResponse> | null;
	fields?: Record<string, FieldAltResponse> | null;
}

export interface ResponseBody<D = unknown> {
	data: D;
	links?: {
		first: string | null;
		last: string | null;
		next: string | null;
		prev: string | null;
	};
	meta: {
		links: Array<{
			active: boolean;
			label: string;
			url: string | null;
			page: number;
		}>;
		path: string;

		currentPage: number | null;
		lastPage: number | null;
		perPage: number | null;
		total: number | null;
	};
}

export interface ErrorResponse {
	status: number;
	code?: string;
	name: string;
	message: string;
	errors?: ErrorResult;
}

export type Permission =
	| "create_user"
	| "update_user"
	| "delete_user"
	| "create_role"
	| "update_role"
	| "delete_role"
	| "create_media"
	| "update_media"
	| "delete_media"
	| "read_email"
	| "delete_email"
	| "send_email"
	| "create_content"
	| "publish_content"
	| "restore_content"
	| "update_content"
	| "delete_content"
	| "delete_collection"
	| "create_collection"
	| "update_collection"
	| "create_client_integration"
	| "update_client_integration"
	| "delete_client_integration"
	| "regenerate_client_integration";

export type PermissionGroup = {
	key: string;
	permissions: Permission[];
};

export type PermissionGroupKey =
	| "users"
	| "roles"
	| "media"
	| "emails"
	| "content"
	| "client-integrations";

export interface ClientIntegrationResponse {
	id: number;
	key: string;
	name: string;
	description: string | null;
	enabled: BooleanInt;
	createdAt: string | null;
	updatedAt: string | null;
}
