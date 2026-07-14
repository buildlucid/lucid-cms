import type { Readable } from "node:stream";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import type { AdapterLifecycleContext } from "../runtime/types.js";

export type ImageProcessorOptions = {
	width?: number;
	height?: number;
	fit?: "cover" | "contain" | "fill" | "inside" | "outside";
	focalPoint?: { x: number; y: number };
	format?: "webp" | "avif" | "jpeg" | "png";
	quality?: number;
};

export type ImageProcessorResult =
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

export type ImageProcessorProcessParams = {
	stream: Readable;
	options: ImageProcessorOptions;
};

export type ImageProcessorServiceProcess = (
	context: ServiceContext,
	params: ImageProcessorProcessParams,
) => ServiceResponse<ImageProcessorResult>;

export type ImageProcessor<T = undefined> = T extends undefined
	? () => ImageProcessorInstance | Promise<ImageProcessorInstance>
	: (options: T) => ImageProcessorInstance | Promise<ImageProcessorInstance>;

export type ImageProcessorInstance = {
	/** The adapter type */
	type: "image-processor";
	/** A unique identifier key for the adapter of this type */
	key: "passthrough" | "sharp" | string;
	/**
	 * Lifecycle callbacks
	 */
	lifecycle?: {
		/** Initialize the adapter */
		init?: (context: AdapterLifecycleContext) => Promise<void>;
		/** Destroy the adapter */
		destroy?: (context: AdapterLifecycleContext) => Promise<void>;
	};
	/** Process an image stream */
	process: ImageProcessorServiceProcess;
};
