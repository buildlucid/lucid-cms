//* contains only type exports relating to the integration client endpoints

export type ImageProcessorOptions = {
	width?: number;
	height?: number;
	format?: "webp" | "avif" | "jpeg" | "png";
	quality?: number;
};

type BrickType = "builder" | "fixed";

type FieldType =
	| "checkbox"
	| "color"
	| "datetime"
	| "document"
	| "json"
	| "link"
	| "media"
	| "number"
	| "repeater"
	| "rich-text"
	| "select"
	| "tab"
	| "text"
	| "textarea"
	| "user";

type DocumentVersionType = "latest" | "revision" | string;

type LinkValue = {
	url: string | null;
	target: string | null;
	label: string | null;
} | null;

type DocumentFieldValue = {
	id: number;
	collectionKey: string;
};

type DocumentFieldError = {
	key: string;
	localeCode: string | null;
	message: string;
	itemIndex?: number;
	groupErrors?: DocumentFieldGroupError[];
};

type DocumentFieldGroupError = {
	ref: string;
	order: number;
	fields: DocumentFieldError[];
};

type DocumentBrickError = {
	ref: string;
	key: string;
	order: number;
	fields: DocumentFieldError[];
};

type ErrorResultValue =
	| ErrorResultObject
	| ErrorResultObject[]
	| DocumentFieldError[]
	| DocumentFieldGroupError[]
	| DocumentBrickError[]
	| string
	| undefined;

type ErrorResultObject = {
	code?: string;
	message?: string;
	children?: ErrorResultObject[];
	[key: string]: ErrorResultValue;
};

type ErrorResult = Record<string, ErrorResultValue>;

type DocumentFieldValueResponse =
	| boolean
	| number
	| string
	| LinkValue
	| Record<string, unknown>
	| DocumentFieldValue[]
	| number[]
	| null
	| undefined;

type DocumentFieldRef = DocumentRef | MediaRef | UserRef | null | undefined;

type DocumentAuthor = {
	id: number;
	email: string | null;
	firstName: string | null;
	lastName: string | null;
	username: string | null;
} | null;

type DocumentVersionSummary = {
	id: number;
	promotedFrom: number | null;
	contentId: string;
	createdAt: string | null;
	createdBy: number | null;
};

type ResponseMetaLink = {
	active: boolean;
	label: string;
	url: string | null;
	page: number;
};

export interface DocumentField {
	key: string;
	type: FieldType;
	groupRef?: string;
	translations?: Record<string, DocumentFieldValueResponse>;
	value?: DocumentFieldValueResponse;
	groups?: Array<DocumentFieldGroup>;
}

export interface DocumentFieldGroup {
	ref: string;
	order: number;
	open: boolean;
	fields: Record<string, DocumentField>;
}

export interface DocumentBrick {
	ref: string;
	key: string;
	order: number;
	open: boolean;
	type: BrickType;
	fields: Record<string, DocumentField>;
	id: number;
}

export interface DocumentRef {
	id: number;
	versionId?: number;
	collectionKey: string;
	fields: Record<string, DocumentField> | null;
}

export type MediaType =
	| "image"
	| "video"
	| "audio"
	| "document"
	| "archive"
	| "unknown";

export type MediaRef = {
	id: number;
	url: string;
	key: string;
	mimeType: string;
	extension: string;
	fileSize: number;
	width: number | null;
	height: number | null;
	blurHash: string | null;
	averageColor: string | null;
	isDark: boolean | null;
	isLight: boolean | null;
	title: Record<string, string>;
	alt: Record<string, string>;
	type: MediaType;
	isDeleted: boolean;
	public: boolean;
} | null;

export type UserRef = {
	id: number;
	username: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
} | null;

export interface Media {
	id: number;
	key: string;
	url: string;
	folderId: number | null;
	title: Array<{
		localeCode: string | null;
		value: string | null;
	}>;
	alt: Array<{
		localeCode: string | null;
		value: string | null;
	}>;
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

export interface Locale {
	code: string;
	name: string | null;
	isDefault: boolean;
	createdAt: string | null;
	updatedAt: string | null;
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
	bricks: Partial<
		Record<
			BrickType,
			Array<{
				brickKey: string | null;
			}>
		>
	>;
}

export interface CollectionDocument {
	id: number;
	collectionKey: string | null;
	status: DocumentVersionType | null;
	version: Record<string, DocumentVersionSummary | null>;
	createdBy: DocumentAuthor;
	createdAt: string | null;
	updatedAt: string | null;
	updatedBy: DocumentAuthor;
	bricks?: Array<DocumentBrick> | null;
	fields?: Record<string, DocumentField> | null;
	refs?: Partial<Record<FieldType, DocumentFieldRef[]>> | null;
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
		links: ResponseMetaLink[];
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
