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
	poster?: MediaPoster | null;
	title: MediaTranslation[];
	alt: MediaTranslation[];
	description: MediaTranslation[];
	summary: MediaTranslation[];
	type: MediaType;
	meta: MediaMeta;
	public: boolean;
	isDeleted: boolean | null;
	isDeletedAt: string | null;
	deletedBy: number | null;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface MediaTranslation {
	localeCode: string | null;
	value: string | null;
}

export interface MediaMeta {
	mimeType: string;
	extension: string;
	fileSize: number;
	width: number | null;
	height: number | null;
	focalPoint: {
		x: number;
		y: number;
	} | null;
	blurHash: string | null;
	averageColor: string | null;
	base64: string | null;
	isDark: boolean | null;
	isLight: boolean | null;
}

export type MediaEmbed = Pick<
	Media,
	| "id"
	| "key"
	| "url"
	| "fileName"
	| "type"
	| "title"
	| "alt"
	| "description"
	| "summary"
	| "meta"
>;

export type MediaPoster = MediaEmbed;
export type MediaRef = Media;
export type ProfilePicture = MediaEmbed;

export interface MediaUrl {
	url: string;
}

export type UploadSessionPart = {
	partNumber: number;
	etag: string;
	size?: number;
};

export type UploadSessionResponse =
	| {
			mode: "single";
			key: string;
			url: string;
			headers?: Record<string, string>;
	  }
	| {
			mode: "resumable";
			key: string;
			sessionId: string;
			partSize: number;
			expiresAt: string;
			uploadedParts: UploadSessionPart[];
	  };

export type UploadSessionStateResponse =
	| {
			canResume: true;
			key: string;
			sessionId: string;
			partSize: number;
			expiresAt: string;
			uploadedParts: UploadSessionPart[];
	  }
	| {
			canResume: false;
			sessionId: string;
			reason: "adapter_not_resumable" | "adapter_changed";
	  };

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
		focalPoint: {
			x: number;
			y: number;
		} | null;
		previewable: boolean;
		shareUrl: string;
		poster: {
			shareUrl: string;
		} | null;
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

export type MediaProcessOptions = {
	preset?: string;
	format?: "webp" | "avif" | "jpeg" | "png";
};
