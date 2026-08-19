export type MediaType =
	| "image"
	| "video"
	| "audio"
	| "document"
	| "archive"
	| "unknown";

export type MediaOrigin = "human" | "ai_generated" | "ai_modified";

export type MediaStatus = "processing" | "ready" | "failed";

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

export type MediaAdapterDataValue =
	| string
	| number
	| boolean
	| null
	| MediaAdapterDataValue[]
	| { [key: string]: MediaAdapterDataValue };

export type MediaAdapterData = Record<string, MediaAdapterDataValue>;

export interface MediaDeliveryDetails {
	adapter: string;
	data: MediaAdapterData | null;
	/** Whether `url` accepts Lucid image preset queries. */
	supportsPresetQuery: boolean;
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

export interface MediaVideoMeta extends MediaFileMeta {
	width: number | null;
	height: number | null;
	duration: number | null;
}

export interface MediaAudioMeta extends MediaFileMeta {
	duration: number | null;
}

export interface MediaFile<Meta extends MediaFileMeta = MediaFileMeta> {
	key: string;
	url: string;
	fileName: string | null;
	meta: Meta;
	delivery: MediaDeliveryDetails;
}

export interface MediaOriginalFile extends MediaFile<MediaImageMeta> {
	sourceType: "original";
}

export type MediaImageFile =
	| (MediaFile<MediaImageMeta> & {
			sourceType: "original";
			original?: never;
			crop?: never;
	  })
	| (MediaFile<MediaImageMeta> & {
			sourceType: "crop";
			crop: MediaCropState;
			original: MediaOriginalFile;
	  });

export type MediaTranslationMap = Record<string, string | null> | null;

interface MediaBase<Type extends MediaType> {
	id: number;
	type: Type;
	status: MediaStatus;
	folderId: number | null;
	origin: MediaOrigin;
	title: MediaTranslationMap;
	public: boolean;
	isDeleted: boolean | null;
	isDeletedAt: string | null;
	deletedBy: number | null;
	createdAt: string | null;
	updatedAt: string | null;
}

export type MediaImage = MediaBase<"image"> &
	MediaImageFile & {
		alt: MediaTranslationMap;
	};

export type MediaVideo = MediaBase<"video"> &
	MediaVideoFile & {
		description: MediaTranslationMap;
		poster: MediaPoster | null;
	};

export interface MediaVideoFile extends MediaFile<MediaVideoMeta> {
	sources: MediaVideoSource[];
	thumbnail: MediaVideoThumbnail | null;
}

export interface MediaVideoSource {
	url: string;
	mimeType: string;
	kind: "progressive" | "hls" | "dash";
}

export interface MediaVideoThumbnail {
	url: string;
	mimeType: string;
	width: number | null;
	height: number | null;
}

export type MediaAudio = MediaBase<"audio"> &
	MediaAudioFile & {
		description: MediaTranslationMap;
	};

export type MediaAudioFile = MediaFile<MediaAudioMeta>;

export type MediaDocument = MediaBase<"document"> &
	MediaFile & {
		summary: MediaTranslationMap;
	};

export type MediaArchive = MediaBase<"archive"> & MediaFile;

export type MediaUnknown = MediaBase<"unknown"> & MediaFile;

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

type MediaImageReference = {
	id: number;
	type: "image";
	status: MediaStatus;
	origin: MediaOrigin;
	alt: MediaTranslationMap;
};

export type MediaPoster = MediaImageReference & MediaImageFile;

export type MediaRef = Media;

export type MediaImagePreview = MediaImageReference &
	MediaImageFile & {
		title: MediaTranslationMap;
	};

export type ProfilePicture = MediaImagePreview;

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
			protocol: "http";
			key: string;
			sessionId: string;
			expiresAt: string;
			request: {
				url: string;
				method: "PUT" | "POST";
				headers?: Record<string, string>;
				body:
					| { type: "raw" }
					| {
							type: "form-data";
							fileField: string;
							fields: Record<string, string>;
					  };
			};
	  }
	| {
			protocol: "multipart-parts";
			key: string;
			sessionId: string;
			partSize: number;
			expiresAt: string;
			uploadedParts: UploadSessionPart[];
	  }
	| {
			protocol: "tus";
			key: string;
			sessionId: string;
			endpoint: string;
			headers: Record<string, string>;
			metadata?: Record<string, string>;
			expiresAt: string;
	  };

export type UploadSessionStateResponse =
	| {
			canResume: true;
			protocol: "multipart-parts";
			key: string;
			sessionId: string;
			partSize: number;
			expiresAt: string;
			uploadedParts: UploadSessionPart[];
	  }
	| {
			canResume: true;
			protocol: "tus";
			key: string;
			sessionId: string;
			endpoint: string;
			headers: Record<string, string>;
			metadata?: Record<string, string>;
			expiresAt: string;
	  }
	| {
			canResume: false;
			sessionId: string;
			reason:
				| "protocol_not_resumable"
				| "adapter_not_resumable"
				| "adapter_changed";
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
		duration: number | null;
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

export type MediaResolveUrlOptions = {
	preset?: string;
	format?: "webp" | "avif" | "jpeg" | "png";
};
