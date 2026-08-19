import type { Readable } from "node:stream";
import type { MediaAdapterData, MediaType } from "../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import type { AdapterLifecycleContext } from "../runtime/types.js";

export type MediaTransformationOptions = {
	width?: number;
	height?: number;
	fit?: "cover" | "contain" | "fill" | "inside" | "outside";
	focalPoint?: { x: number; y: number };
	format?: "webp" | "avif" | "jpeg" | "png";
	quality?: number;
	rotate?: 0 | 90 | 180 | 270;
};

export type MediaDeliveryProcessResult =
	| {
			processed: false;
	  }
	| {
			processed: true;
			buffer: Buffer;
			mimeType: string;
			size: number;
			extension: string;
			shouldStore: boolean;
	  };

export type MediaDeliveryProcessImageParams = {
	stream: Readable;
	options: MediaTransformationOptions;
};

export type MediaDeliveryServiceProcessImage = (
	context: ServiceContext,
	params: MediaDeliveryProcessImageParams,
) => ServiceResponse<MediaDeliveryProcessResult>;

export type MediaDeliveryFile = {
	key: string;
	fileName: string | null;
	type: MediaType;
	mimeType: string;
	extension: string;
	width: number | null;
	height: number | null;
	duration: number | null;
	focalPoint: { x: number; y: number } | null;
	storage: {
		adapterKey: string;
		adapterReference: string | null;
		adapterData: MediaAdapterData | null;
	};
};

export type MediaDeliveryResolveFileParams = {
	host: string;
	file: MediaDeliveryFile;
	/** The validated Lucid preset name, when the transformation came from one. */
	preset?: string;
	transformation?: MediaTransformationOptions;
};

export type MediaDeliveryFileResolution =
	| { type: "lucid" }
	| { type: "external"; url: string }
	| { type: "unsupported" };

export type MediaDeliveryVideoSource = {
	url: string;
	mimeType: string;
	kind: "progressive" | "hls" | "dash";
};

export type MediaDeliveryVideoThumbnail = {
	url: string;
	mimeType: string;
	width?: number | null;
	height?: number | null;
};

export type MediaDeliveryVideo = {
	sources: MediaDeliveryVideoSource[];
	thumbnail?: MediaDeliveryVideoThumbnail | null;
};

export type MediaDeliveryResolveFile = (
	params: MediaDeliveryResolveFileParams,
) => MediaDeliveryFileResolution;

export type MediaDeliveryResolveVideo = (params: {
	host: string;
	file: MediaDeliveryFile;
}) => MediaDeliveryVideo | null;

export type MediaDeliveryResolveResponseData = (params: {
	host: string;
	file: MediaDeliveryFile;
}) => MediaAdapterData | null;

export type MediaDeliveryAdapter<T = undefined> = T extends undefined
	? () => MediaDeliveryAdapterInstance | Promise<MediaDeliveryAdapterInstance>
	: (
			options: T,
		) => MediaDeliveryAdapterInstance | Promise<MediaDeliveryAdapterInstance>;

export type MediaDeliveryAdapterInstance = {
	/** The adapter type. */
	type: "media-delivery-adapter";
	/** A unique identifier for this delivery adapter. */
	key: string;
	lifecycle?: {
		init?: (context: AdapterLifecycleContext) => Promise<void>;
		destroy?: (context: AdapterLifecycleContext) => Promise<void>;
	};
	/** Resolve whether a public file is served by Lucid or an external provider. */
	resolveFile: MediaDeliveryResolveFile;
	/** Process an image when the resolved URL uses Lucid's CDN. */
	processImage?: MediaDeliveryServiceProcessImage;
	/** Return provider-backed playback sources and a thumbnail for a public video. */
	resolveVideo?: MediaDeliveryResolveVideo;
	/** Return explicitly public, JSON-safe adapter data for content consumers. */
	resolveResponseData?: MediaDeliveryResolveResponseData;
};
