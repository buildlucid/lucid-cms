import type z from "zod";
import type { BrickTypes } from "../libs/collection/builders/brick-builder/types.js";
import type {
	CollectionBrickConfig,
	CollectionConfigSchemaType,
} from "../libs/collection/builders/collection-builder/types.js";
import type {
	CFConfig,
	FieldRef,
	FieldTypes,
	FieldValue,
} from "../libs/collection/custom-fields/types.js";
import type { MigrationStatus } from "../libs/collection/get-collection-migration-status.js";
import type { DocumentVersionType } from "../libs/db-adapter/types.js";
import type { Permission } from "../libs/permission/types.js";
import type {
	QueueEvent,
	QueueJobStatus,
} from "../libs/queue-adapter/types.js";
import type { clientIntegrationResponseSchema } from "../schemas/client-integrations.js";
import type { OptionsName } from "../schemas/options.js";
import type { AuthProvider, EmailDeliveryStatus, EmailType } from "../types.js";
import type { ErrorResult } from "./errors.js";
import type {
	CollectionDocumentStatus,
	CollectionDocumentVersionKey,
} from "./query-params.js";
import type { LocaleValue } from "./shared.js";

export type UserPermission = {
	roles: Array<{
		id: number;
		name: string;
	}>;
	permissions: Permission[];
};

export type User = {
	id: number;
	username: string;
	firstName: string | null;
	lastName: string | null;
	isDeleted: boolean;
	email: string;
	deletedAt?: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;
	isLocked?: boolean;
	superAdmin?: boolean;
	triggerPasswordReset?: boolean | null;
	invitationAccepted?: boolean;
	roles?: UserPermission["roles"];
	permissions?: UserPermission["permissions"];
	hasPassword?: boolean;
	authProviders?: Array<{
		id: number;
		providerKey: string;
		providerUserId: string;
		linkedAt: string | null;
	}>;
};

export type AuthProviders = {
	disablePassword: boolean;
	providers: Array<Omit<AuthProvider, "config" | "enabled">>;
};
export type InitiateAuth = {
	redirectUrl: string;
};

export type SettingsInclude = "email" | "media" | "license" | "system";

export interface Settings {
	email?: {
		simulated: boolean;
		templates: string[];
		from: {
			email: string;
			name: string;
		} | null;
	};
	media?: {
		enabled: boolean;
		storage: {
			total: number | null;
			remaining: number | null;
			used: number | null;
		};
		processed: {
			stored: boolean;
			imageLimit: number;
			total: number | null;
		};
	};
	license?: {
		key: string | null;
	};
	system?: {
		runtime: string;
		database: string;
		kv: string;
		queue: string;
		media: string | null;
		email: string;
		imageProcessor: string | null;
	};
}

export interface Role {
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

export interface Option {
	name: OptionsName;
	valueText: string | null;
	valueInt: number | null;
	valueBool: boolean | null;
}

export interface License {
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

export interface Media {
	id: number;
	key: string;
	url: string;
	fileName: string | null;
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

export interface MediaUrl {
	url: string;
}

export interface MediaShareLink {
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

export interface ShareLinkAccessGranted {
	token: string;
	name: string | null;
	description: string | null;
	expiresAt: string | null;
	hasExpired: boolean;
	passwordRequired: false;
	media: {
		key: string;
		type: MediaType;
		mimeType: string;
		extension: string;
		fileSize: number;
		width: number | null;
		height: number | null;
		previewable: boolean;
		shareUrl: string;
	};
}

export interface ShareLinkAccessProtected {
	token: string;
	passwordRequired: true;
}

export type ShareLinkAccess = ShareLinkAccessGranted | ShareLinkAccessProtected;

export interface MediaFolder {
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
export interface MediaFolderBreadcrumb {
	id: number;
	title: string;
	parentFolderId: number | null;
}
export interface MultipleMediaFolder {
	folders: MediaFolder[];
	breadcrumbs: MediaFolderBreadcrumb[];
}

export interface Locale {
	code: string;
	name: string | null;
	isDefault: boolean;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface Email {
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

export interface Job {
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

export interface Collection {
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
		useRevisions: boolean;
		isLocked: boolean;
		displayInListing: string[];
		useAutoSave: boolean;
		environments: {
			key: string;
			name: LocaleValue;
		}[];
	};
	migrationStatus?: MigrationStatus | null;
	fixedBricks: Array<CollectionBrickConfig>;
	builderBricks: Array<CollectionBrickConfig>;
	fields: CFConfig<FieldTypes>[];
}

export interface InternalDocumentBrick {
	ref: string;
	key: string;
	order: number;
	open: boolean;
	type: BrickTypes;
	fields: Array<InternalDocumentField>;
	id: number;
}
export type DocumentRelationValue<TCollectionKey extends string = string> = {
	id: number;
	collectionKey: TCollectionKey;
};

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentFieldsByCollection {}

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentBricksByCollection {}

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentLocaleCodes {}

export type DocumentFieldMap = Record<string, DocumentField>;

type CollectionDocumentBrickKey = Extract<
	keyof CollectionDocumentBricksByCollection,
	string
>;

type CollectionDocumentFieldKey = Extract<
	keyof CollectionDocumentFieldsByCollection,
	string
>;

type KnownCollectionDocumentKey = CollectionDocumentFieldKey;

type KnownCollectionDocumentLocaleCode = Extract<
	keyof CollectionDocumentLocaleCodes,
	string
>;

export type CollectionDocumentKey = KnownCollectionDocumentKey | (string & {});

type ExactCollectionDocumentTranslations<TValue> = {
	[TLocaleCode in KnownCollectionDocumentLocaleCode]: TValue;
};

export type CollectionDocumentLocaleCode = [
	KnownCollectionDocumentLocaleCode,
] extends [never]
	? string
	: KnownCollectionDocumentLocaleCode | (string & {});

export type CollectionDocumentTranslations<TValue> = [
	KnownCollectionDocumentLocaleCode,
] extends [never]
	? Record<string, TValue>
	: ExactCollectionDocumentTranslations<TValue> &
			Partial<Record<string, TValue>>;

type ResolveCollectionDocumentFields<TCollectionKey extends string | null> =
	TCollectionKey extends CollectionDocumentFieldKey
		? CollectionDocumentFieldsByCollection[TCollectionKey]
		: DocumentFieldMap;

type ResolveCollectionDocumentBricks<TCollectionKey extends string | null> =
	TCollectionKey extends CollectionDocumentBrickKey
		? CollectionDocumentBricksByCollection[TCollectionKey]
		: DocumentBrick;

type ResolveCollectionDocumentKey<TCollectionKey extends string | null> = [
	TCollectionKey,
] extends [string]
	? TCollectionKey
	: CollectionDocumentKey | null;

type ResolveCollectionDocumentStatus<TCollectionKey extends string | null> =
	CollectionDocumentStatus<
		Extract<ResolveCollectionDocumentKey<TCollectionKey>, string>
	>;

type ResolveCollectionDocumentVersionKey<TCollectionKey extends string | null> =
	CollectionDocumentVersionKey<
		Extract<ResolveCollectionDocumentKey<TCollectionKey>, string>
	>;

export interface DocumentBrick<
	TKey extends string = string,
	TBrickType extends BrickTypes = BrickTypes,
	TFields extends DocumentFieldMap = DocumentFieldMap,
> {
	ref: string;
	key: TKey;
	order: number;
	open: boolean;
	type: TBrickType;
	fields: TFields;
	id: number;
}

export interface InternalDocumentField {
	key: string;
	type: FieldTypes;
	groupRef?: string;
	translations?: Record<string, FieldValue>;
	value?: FieldValue;
	groups?: Array<InternalDocumentFieldGroup>;
}
export interface DocumentFieldGroup<
	TFields extends DocumentFieldMap = DocumentFieldMap,
> {
	ref: string;
	order: number;
	open: boolean;
	fields: TFields;
}

export interface DocumentField<
	TKey extends string = string,
	TType extends FieldTypes = FieldTypes,
	TValue = FieldValue,
	TGroupFields extends DocumentFieldMap = DocumentFieldMap,
> {
	key: TKey;
	type: TType;
	groupRef?: string;
	translations?: CollectionDocumentTranslations<TValue>;
	value?: TValue;
	groups?: Array<DocumentFieldGroup<TGroupFields>>;
}

type DocumentFieldGroupRefShape<THasGroupRef extends boolean> =
	THasGroupRef extends true ? { groupRef: string } : { groupRef?: never };

export type ValueDocumentField<
	TKey extends string = string,
	TType extends FieldTypes = FieldTypes,
	TValue = FieldValue,
	THasGroupRef extends boolean = false,
> = Omit<
	DocumentField<TKey, TType, TValue>,
	"groupRef" | "groups" | "translations" | "value"
> & {
	value: TValue;
	translations?: never;
	groups?: never;
} & DocumentFieldGroupRefShape<THasGroupRef>;

export type TranslatedDocumentField<
	TKey extends string = string,
	TType extends FieldTypes = FieldTypes,
	TValue = FieldValue,
	THasGroupRef extends boolean = false,
> = Omit<
	DocumentField<TKey, TType, TValue>,
	"groupRef" | "groups" | "translations" | "value"
> & {
	translations: CollectionDocumentTranslations<TValue>;
	value?: never;
	groups?: never;
} & DocumentFieldGroupRefShape<THasGroupRef>;

export type GroupDocumentField<
	TKey extends string = string,
	TType extends FieldTypes = FieldTypes,
	TGroupFields extends DocumentFieldMap = DocumentFieldMap,
	THasGroupRef extends boolean = false,
> = Omit<
	DocumentField<TKey, TType, never, TGroupFields>,
	"groupRef" | "groups" | "translations" | "value"
> & {
	groups: Array<DocumentFieldGroup<TGroupFields>>;
	value?: never;
	translations?: never;
} & DocumentFieldGroupRefShape<THasGroupRef>;
export interface InternalDocumentFieldGroup {
	ref: string;
	order: number;
	open: boolean;
	fields: Array<InternalDocumentField>;
}

export interface DocumentVersion {
	id: number;
	versionType: DocumentVersionType;
	promotedFrom: number | null;
	contentId: string;
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

export interface InternalCollectionDocument {
	id: number;
	collectionKey: string;
	status: DocumentVersionType | null;
	versionId: number | null;
	version: Record<
		string,
		{
			id: number;
			promotedFrom: number | null;
			contentId: string;
			createdAt: string | null;
			createdBy: number | null;
		} | null
	>;
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

	bricks?: Array<InternalDocumentBrick> | null;
	fields?: Array<InternalDocumentField> | null;
	refs?: Partial<Record<FieldTypes, FieldRef[]>> | null;
}

export interface CollectionDocument<
	TCollectionKey extends
		CollectionDocumentKey | null = CollectionDocumentKey | null,
> {
	id: number;
	collectionKey: ResolveCollectionDocumentKey<TCollectionKey>;
	status: ResolveCollectionDocumentStatus<TCollectionKey> | null;
	version: Record<
		ResolveCollectionDocumentVersionKey<TCollectionKey>,
		{
			id: number;
			promotedFrom: number | null;
			contentId: string;
			createdAt: string | null;
			createdBy: number | null;
		} | null
	>;
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
	bricks?: Array<ResolveCollectionDocumentBricks<TCollectionKey>> | null;
	fields: ResolveCollectionDocumentFields<TCollectionKey>;
	refs?: Partial<Record<FieldTypes, FieldRef[]>> | null;
}

export type ClientIntegration = z.infer<typeof clientIntegrationResponseSchema>;

export interface UserLogin {
	id: number;
	userId: number | null;
	tokenId: number | null;
	authMethod: string;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string | null;
}

export interface ValidateInvitation {
	valid: boolean;
	user?: {
		id: User["id"];
		email: User["email"];
		username: User["username"];
		firstName: User["firstName"];
		lastName: User["lastName"];
	};
}

// ----------------
// Response Types

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
