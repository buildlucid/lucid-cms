import type { MediaGenerateCompletionResponse } from "@types";
import type { SupportedImageMimeType } from "../types";

/** Builds a stable download filename from the generated file's metadata. */
export const generationFileName = (
	output: MediaGenerateCompletionResponse["output"],
) => `${output.id}.${output.extension.replace(/^\./, "")}`;

/** The number in a generation's ID, such as 3 for "generation-3". */
export const generationNumber = (id: string) =>
	Number(id.replace("generation-", ""));

/** Returns PNG or JPEG MIME types unchanged, defaulting all others to WebP. */
export const normalizeMimeType = (mimeType?: string): SupportedImageMimeType =>
	mimeType === "image/png" || mimeType === "image/jpeg"
		? mimeType
		: "image/webp";
