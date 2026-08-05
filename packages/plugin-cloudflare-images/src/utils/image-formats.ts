export const OUTPUT_FORMATS = ["jpeg", "png", "webp", "avif"] as const;

export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

const MIME_TYPE_TO_FORMAT = {
	"image/jpeg": "jpeg",
	"image/png": "png",
	"image/webp": "webp",
	"image/avif": "avif",
} as const satisfies Record<string, OutputFormat>;

type SupportedMimeType = keyof typeof MIME_TYPE_TO_FORMAT;
type SourceMimeType = Exclude<SupportedMimeType, "image/avif">;

const SOURCE_MIME_TYPES = new Set<SourceMimeType>([
	"image/jpeg",
	"image/png",
	"image/webp",
]);

const FORMAT_TO_MIME_TYPE = {
	jpeg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
	avif: "image/avif",
} as const satisfies Record<OutputFormat, SupportedMimeType>;

const FORMAT_TO_EXTENSION = {
	jpeg: "jpg",
	png: "png",
	webp: "webp",
	avif: "avif",
} as const satisfies Record<OutputFormat, string>;

/** Removes optional parameters and normalizes an image MIME type. */
export const normalizeMimeType = (value: string) =>
	value.split(";", 1)[0]?.trim().toLowerCase() ?? "";

/** Whether the MIME type can be used as a source by this processor. */
export const isSupportedSourceMimeType = (
	value: string,
): value is SourceMimeType => SOURCE_MIME_TYPES.has(value as SourceMimeType);

/** Whether an output format is supported by the Cloudflare Images binding. */
export const isSupportedOutputFormat = (
	value: unknown,
): value is OutputFormat => OUTPUT_FORMATS.includes(value as OutputFormat);

/** Resolves a supported MIME type to its Lucid image format. */
export function getFormatFromMimeType(
	mimeType: SupportedMimeType,
): OutputFormat;
export function getFormatFromMimeType(
	mimeType: string,
): OutputFormat | undefined;
export function getFormatFromMimeType(
	mimeType: string,
): OutputFormat | undefined {
	return mimeType in MIME_TYPE_TO_FORMAT
		? MIME_TYPE_TO_FORMAT[mimeType as SupportedMimeType]
		: undefined;
}

/** Resolves a Lucid output format to the MIME type expected by Cloudflare. */
export const getMimeTypeFromFormat = (format: OutputFormat) =>
	FORMAT_TO_MIME_TYPE[format];

/** Resolves the persisted file extension for an output format. */
export const getExtensionFromFormat = (format: OutputFormat) =>
	FORMAT_TO_EXTENSION[format];
