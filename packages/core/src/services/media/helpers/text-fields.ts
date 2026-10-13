import type { MediaType } from "../../../types/response.js";

/** The translated text fields each media type has, on top of the title every type has. */
export const mediaTextFields = {
	image: ["alt"],
	video: ["description"],
	audio: ["description", "transcript"],
	document: ["summary"],
	archive: [],
	unknown: [],
} as const satisfies Record<MediaType, readonly string[]>;

/** A translated text field that only some media types have. */
export type MediaTextField = (typeof mediaTextFields)[MediaType][number];
