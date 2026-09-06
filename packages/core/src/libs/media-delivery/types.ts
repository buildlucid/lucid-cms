import type { Readable } from "node:stream";
import type { MediaAdapterData, MediaType } from "../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import type { AdapterLifecycleContext } from "../runtime/types.js";

/** Image transformation request. Supported options depend on the delivery adapter. */
export type MediaTransformationOptions = {
	/** Target width in pixels. */
	width?: number;
	/** Target height in pixels. */
	height?: number;
	fit?: "cover" | "contain" | "fill" | "inside" | "outside";
	/** Normalized crop focus coordinates from 0 to 1. */
	focalPoint?: { x: number; y: number };
	format?: "webp" | "avif" | "jpeg" | "png";
	/** Output quality from 1 to 100. */
	quality?: number;
	/** Clockwise rotation in degrees. */
	rotate?: 0 | 90 | 180 | 270;
};

/** Return processed: false to leave the original image unchanged, or provide the processed bytes and file metadata. */
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
			/** Whether Lucid may cache these processed bytes in media storage. */
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

/** Serve through Lucid, use an external URL, or report that the requested file is unsupported. */
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
	/** Target width in pixels. */
	width?: number | null;
	/** Target height in pixels. */
	height?: number | null;
};

export type MediaDeliveryVideo = {
	sources: MediaDeliveryVideoSource[];
	thumbnail?: MediaDeliveryVideoThumbnail | null;
};

export type MediaDeliveryResolveFile = (
	params: MediaDeliveryResolveFileParams,
) => MediaDeliveryFileResolution;

/** Return playback sources and an optional thumbnail, or null when video delivery is unsupported. */
export type MediaDeliveryResolveVideo = (params: {
	host: string;
	file: MediaDeliveryFile;
}) => MediaDeliveryVideo | null;

/** Return only public JSON-safe provider metadata for content API responses. */
export type MediaDeliveryResolveResponseData = (params: {
	host: string;
	file: MediaDeliveryFile;
}) => MediaAdapterData | null;

/** Factory that returns a configured adapter, synchronously or asynchronously. */
export type MediaDeliveryAdapter<T = undefined> = T extends undefined
	? () => MediaDeliveryAdapterInstance | Promise<MediaDeliveryAdapterInstance>
	: (
			options: T,
		) => MediaDeliveryAdapterInstance | Promise<MediaDeliveryAdapterInstance>;

/** Adapter contract used by Lucid. Use the context supplied to each operation for current request and transaction state. */
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
