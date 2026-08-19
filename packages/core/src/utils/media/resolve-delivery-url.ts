import type {
	MediaDeliveryAdapterInstance,
	MediaDeliveryFile,
	MediaTransformationOptions,
} from "../../libs/media-delivery/types.js";
import createMediaUrl from "./create-media-url.js";

/** Resolves one safe public source without exposing delivery-adapter details. */
const resolveDeliveryUrl = (props: {
	delivery: MediaDeliveryAdapterInstance;
	file: MediaDeliveryFile;
	host: string;
	public: boolean;
	preset?: string;
	transformation?: MediaTransformationOptions;
	query?: Record<string, string | undefined>;
}): string | null => {
	// Private files always stay behind Lucid authentication. Local delivery
	// adapters can still transform them through the Lucid CDN route.
	if (!props.public) {
		return props.transformation && !props.delivery.processImage
			? null
			: createMediaUrl({
					key: props.file.key,
					host: props.host,
					fileName: props.file.fileName,
					extension: props.transformation?.format ?? props.file.extension,
					query:
						props.query ??
						(props.preset ? { preset: props.preset } : undefined),
				});
	}

	const resolution = props.delivery.resolveFile({
		host: props.host,
		file: props.file,
		transformation: props.transformation,
	});

	if (resolution.type === "external") return resolution.url;
	if (resolution.type === "unsupported") {
		return props.transformation
			? null
			: createMediaUrl({
					key: props.file.key,
					host: props.host,
					fileName: props.file.fileName,
					extension: props.file.extension,
					query:
						props.query ??
						(props.preset ? { preset: props.preset } : undefined),
				});
	}
	if (props.transformation && !props.delivery.processImage) return null;

	return createMediaUrl({
		key: props.file.key,
		host: props.host,
		fileName: props.file.fileName,
		extension: props.transformation?.format ?? props.file.extension,
		query: props.query ?? (props.preset ? { preset: props.preset } : undefined),
	});
};

export default resolveDeliveryUrl;
