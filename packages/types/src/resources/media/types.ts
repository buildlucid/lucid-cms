export type MediaType =
	| "image"
	| "video"
	| "audio"
	| "document"
	| "archive"
	| "unknown";

export type MediaOrigin = "human" | "ai_generated" | "ai_modified";

export type MediaSourceType = "original" | "crop";

export interface MediaCropState {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	skewX: number;
	skewY: number;
}

export interface MediaCropInput {
	key: string;
	fileName: string;
	width: number;
	height: number;
	focalPoint?: MediaImageMeta["focalPoint"];
	blurHash?: string | null;
	averageColor?: string | null;
	base64?: string | null;
	isDark?: boolean | null;
	isLight?: boolean | null;
	state: MediaCropState;
}

export interface MediaFileMeta {
	mimeType: string;
	extension: string;
	fileSize: number;
}

export interface MediaImageMeta extends MediaFileMeta {
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

export interface MediaFile<Meta extends MediaFileMeta = MediaFileMeta> {
	key: string;
	url: string;
	fileName: string | null;
	meta: Meta;
}

export interface MediaOriginalFile {
	key: string;
	url: string;
	meta: MediaImageMeta;
}

export type MediaImageFile =
	| {
			key: string;
			url: string;
			fileName: string | null;
			sourceType: "original";
			meta: MediaImageMeta;
			original?: never;
			crop?: never;
	  }
	| {
			key: string;
			url: string;
			fileName: string | null;
			sourceType: "crop";
			crop: MediaCropState;
			meta: MediaImageMeta;
			original: MediaOriginalFile;
	  };

interface MediaBase<Type extends MediaType> {
	id: number;
	type: Type;
	folderId: number | null;
	origin: MediaOrigin;
	title: MediaTranslation[];
	public: boolean;
	isDeleted: boolean | null;
	isDeletedAt: string | null;
	deletedBy: number | null;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface MediaImage extends MediaBase<"image"> {
	alt: MediaTranslation[];
	file: MediaImageFile;
}

export interface MediaVideo extends MediaBase<"video"> {
	description: MediaTranslation[];
	file: MediaFile;
	poster: MediaPoster | null;
}

export interface MediaAudio extends MediaBase<"audio"> {
	description: MediaTranslation[];
	file: MediaFile;
}

export interface MediaDocument extends MediaBase<"document"> {
	summary: MediaTranslation[];
	file: MediaFile;
}

export interface MediaArchive extends MediaBase<"archive"> {
	file: MediaFile;
}

export interface MediaUnknown extends MediaBase<"unknown"> {
	file: MediaFile;
}

export type Media =
	| MediaImage
	| MediaVideo
	| MediaAudio
	| MediaDocument
	| MediaArchive
	| MediaUnknown;

export interface MediaTranslation {
	localeCode: string | null;
	value: string | null;
}

export interface MediaPoster {
	id: number;
	type: "image";
	origin: MediaOrigin;
	alt: MediaTranslation[];
	file: MediaImageFile;
}

export type MediaRef = Media;

export interface ProfilePicture {
	id: number;
	type: "image";
	origin: MediaOrigin;
	title: MediaTranslation[];
	alt: MediaTranslation[];
	file: MediaImageFile;
}

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
		sourceType: MediaSourceType;
		origin: MediaOrigin;
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
