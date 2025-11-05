import type z from "zod/v4";
import type { BrickTypes } from "../libs/builders/brick-builder/types.js";
import type {
	CollectionBrickConfig,
	CollectionConfigSchemaType,
} from "../libs/builders/collection-builder/types.js";
import type { MigrationStatus } from "../libs/collection/get-collection-migration-status.js";
import type {
	CFConfig,
	FieldResponseMeta,
	FieldResponseValue,
	FieldTypes,
} from "../libs/custom-fields/types.js";
import type { DocumentVersionType } from "../libs/db-adapter/types.js";
import type {
	QueueEvent,
	QueueJobStatus,
} from "../libs/queue-adapter/types.js";
import type { clientIntegrationResponseSchema } from "../schemas/client-integrations.js";
import type { OptionsName } from "../schemas/options.js";
import type { AuthProvider, EmailDeliveryStatus, EmailType } from "../types.js";
import type { ErrorResult } from "./errors.js";
import type { LocaleValue } from "./shared.js";

export interface UserResponse {
	id: number;
	superAdmin?: boolean;
	email: string;
	username: string;
	firstName: string | null;
	lastName: string | null;
	triggerPasswordReset?: boolean | null;
	invitationAccepted: boolean;
	roles?: UserPermissionsResponse["roles"];
	permissions?: UserPermissionsResponse["permissions"];
	hasPassword?: boolean;
	authProviders?: Array<{
		id: number;
		providerKey: string;
		providerUserId: string;
		linkedAt: string | null;
	}>;
	isDeleted: boolean;
	deletedAt?: string | null;
	createdAt: string | null;
	updatedAt?: string | null;
}

export type AuthProvidersResponse = {
	disablePassword: boolean;
	providers: Array<Omit<AuthProvider, "config" | "enabled">>;
};
export type InitiateAuthResponse = {
	redirectUrl: string;
};

export interface UserPermissionsResponse {
	roles: Array<{
		id: number;
		name: string;
	}>;
	permissions: Permission[];
}

export interface SettingsResponse {
	email: {
		from: {
			email: string;
			name: string;
		};
	};
	media: {
		enabled: boolean;
		storage: {
			total: number;
			remaining: number | null;
			used: number | null;
		};
		processed: {
			stored: boolean;
			imageLimit: number;
			total: number | null;
		};
	};
	license: {
		key: string | null;
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

export interface OptionsResponse {
	name: OptionsName;
	valueText: string | null;
	valueInt: number | null;
	valueBool: boolean | null;
}

export interface LicenseResponse {
	key: string | null;
	valid: boolean;
	lastChecked: number | null;
	errorMessage: string | null;
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
	folderId: number | null;
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
		averageColor: string | null;
		isDark: boolean | null;
		isLight: boolean | null;
	};
	public: boolean;
	isDeleted: boolean | null;
	isDeletedAt: string | null;
	deletedBy: number | null;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface MediaUrlResponse {
	url: string;
}

export interface MediaShareLinkResponse {
	id: number;
	token: string;
	url: string;
	name: string | null;
	description: string | null;
	expiresAt: string | null;
	hasExpired: boolean;
	createdAt: string | null;
	updatedAt: string | null;
	createdBy: number | null;
	updatedBy: number | null;
	hasPassword: boolean;
}

export interface MediaFolderResponse {
	id: number;
	title: string;
	parentFolderId: number | null;
	folderCount: number;
	mediaCount: number;
	meta?: {
		level: number;
		order: number;
		label: string;
	};
	createdBy: number | null;
	updatedBy: number | null;
	createdAt: string | null;
	updatedAt: string | null;
}
export interface MediaFolderBreadcrumbResponse {
	id: number;
	title: string;
	parentFolderId: number | null;
}
export interface MultipleMediaFolderResponse {
	folders: MediaFolderResponse[];
	breadcrumbs: MediaFolderBreadcrumbResponse[];
}

export interface LocalesResponse {
	code: string;
	name: string | null;
	isDefault: boolean;
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
	type: EmailType;
	currentStatus: EmailDeliveryStatus;
	attemptCount: number;
	lastAttemptedAt: string | null;
	html: string | null;
	transactions: {
		deliveryStatus: EmailDeliveryStatus;
		message: string | null;
		strategyIdentifier: string;
		strategyData: Record<string, unknown> | null;
		simulate: boolean;
		externalMessageId: string | null;
		createdAt: string | null;
		updatedAt: string | null;
	}[];
	createdAt: string | null;
	updatedAt?: string | null;
}

export interface JobResponse {
	id: number;
	jobId: string;
	eventType: QueueEvent;
	eventData: Record<string, unknown>;
	queueAdapterKey: string;
	status: QueueJobStatus;
	priority: number | null;
	attempts: number;
	maxAttempts: number;
	errorMessage: string | null;
	createdAt: string | null;
	scheduledFor: string | null;
	startedAt: string | null;
	completedAt: string | null;
	failedAt: string | null;
	nextRetryAt: string | null;
	createdByUserId: number | null;
	updatedAt: string | null;
}

export interface CollectionResponse {
	key: string;
	documentId?: number | null;
	mode: CollectionConfigSchemaType["mode"];
	details: {
		name: LocaleValue;
		singularName: LocaleValue;
		summary: LocaleValue | null;
	};
	config: {
		useTranslations: boolean;
		useDrafts: boolean;
		useRevisions: boolean;
		isLocked: boolean;
		displayInListing: string[];
		useAutoSave: boolean;
	};
	migrationStatus?: MigrationStatus | null;
	fixedBricks: Array<CollectionBrickConfig>;
	builderBricks: Array<CollectionBrickConfig>;
	fields: CFConfig<FieldTypes>[];
}

export interface BrickResponse {
	ref: string;
	key: string;
	order: number;
	open: boolean;
	type: BrickTypes;
	fields: Array<FieldResponse>;
	id: number;
}
export interface BrickAltResponse {
	ref: string;
	key: string;
	order: number;
	open: boolean;
	type: BrickTypes;
	fields: Record<string, FieldAltResponse>;
	id: number;
}

export interface FieldResponse {
	key: string;
	type: FieldTypes;
	groupRef?: string;
	translations?: Record<string, FieldResponseValue>;
	value?: FieldResponseValue;
	meta?: Record<string, FieldResponseMeta> | FieldResponseMeta;
	groups?: Array<FieldGroupResponse>;
}
export interface FieldAltResponse {
	key: string;
	type: FieldTypes;
	groupRef?: string;
	translations?: Record<string, FieldResponseValue>;
	value?: FieldResponseValue;
	meta?: Record<string, FieldResponseMeta> | FieldResponseMeta;
	groups?: Array<FieldGroupAltResponse>;
}
export interface FieldGroupResponse {
	ref: string;
	order: number;
	open: boolean;
	fields: Array<FieldResponse>;
}
export interface FieldGroupAltResponse {
	ref: string;
	order: number;
	open: boolean;
	fields: Record<string, FieldAltResponse>;
}

export interface DocumentVersionResponse {
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
			brickKey: string | null;
		}>
	>;
}

export interface DocumentResponse {
	id: number;
	collectionKey: string;
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
	isDeleted: boolean;
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
	| "read_job"
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
	| "regenerate_client_integration"
	| "clear_kv"
	| "update_license";

export type PermissionGroup = {
	key: string;
	permissions: Permission[];
};

export type PermissionGroupKey =
	| "users"
	| "roles"
	| "media"
	| "emails"
	| "jobs"
	| "content"
	| "client-integrations"
	| "settings";

export type ClientIntegrationResponse = z.infer<
	typeof clientIntegrationResponseSchema
>;

export interface UserLoginResponse {
	id: number;
	userId: number | null;
	tokenId: number | null;
	authMethod: string;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string | null;
}

export interface ValidateInvitationResponse {
	valid: boolean;
	user?: {
		id: UserResponse["id"];
		email: UserResponse["email"];
		username: UserResponse["username"];
		firstName: UserResponse["firstName"];
		lastName: UserResponse["lastName"];
	};
}
