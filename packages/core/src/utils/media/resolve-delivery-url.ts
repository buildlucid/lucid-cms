import type {
	MediaDeliveryAdapterInstance,
	MediaDeliveryFile,
	MediaTransformationOptions,
} from "../../libs/media-delivery/types.js";
import createMediaUrl from "./create-media-url.js";

type ResolveDeliveryUrlProps = {
	delivery: MediaDeliveryAdapterInstance;
	file: MediaDeliveryFile;
	host: string;
	public: boolean;
	preset?: string;
	query?: Record<string, string | undefined>;
};

/** Resolves original files to a URL. Transformations return null when unsupported. */
function resolveDeliveryUrl(
	props: ResolveDeliveryUrlProps & { transformation?: undefined },
): string;
function resolveDeliveryUrl(
	props: ResolveDeliveryUrlProps & {
		transformation: MediaTransformationOptions;
	},
): string | null;
function resolveDeliveryUrl(
	props: ResolveDeliveryUrlProps & {
		transformation?: MediaTransformationOptions;
	},
): string | null {
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
		preset: props.preset,
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
}

export default resolveDeliveryUrl;
