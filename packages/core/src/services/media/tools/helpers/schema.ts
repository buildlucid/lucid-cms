import z from "zod";
import { mediaStatusSchema } from "../../../../schemas/media.js";
import type { MediaType } from "../../../../types/response.js";

export const mediaTypes = [
	"image",
	"video",
	"audio",
	"document",
	"archive",
	"unknown",
] as const satisfies readonly MediaType[];

/** A media record in one content locale, as the media tools return it. */
export const mediaItemSchema = z.object({
	id: z.number().meta({ description: "Media ID." }),
	type: z.enum(mediaTypes).meta({ description: "Media kind." }),
	status: mediaStatusSchema.meta({
		description: "Media processing status.",
	}),
	title: z.string().nullable().meta({ description: "Localized media title." }),
	alt: z
		.string()
		.nullable()
		.meta({ description: "Localized image or poster alt text." }),
	description: z.string().nullable().meta({
		description: "Localized video/audio description or document summary.",
	}),
	fileName: z.string().nullable().meta({ description: "Stored file name." }),
	mimeType: z.string().meta({ description: "Original MIME type." }),
	width: z
		.number()
		.nullable()
		.meta({ description: "Image or video width in pixels." }),
	height: z
		.number()
		.nullable()
		.meta({ description: "Image or video height in pixels." }),
	public: z
		.boolean()
		.meta({ description: "Whether public delivery is enabled." }),
	url: z.string().nullable().meta({
		description: "Public delivery URL; null for private media.",
	}),
	fileSize: z.number().meta({ description: "File size in bytes." }),
	folderId: z
		.number()
		.nullable()
		.meta({ description: "Media library folder ID; null at the top level." }),
	personal: z.boolean().meta({
		description:
			"Whether this is the user's personal media, such as a chat upload. Personal media stays private and out of folders and documents until media_remove_ownership adds it to the library.",
	}),
	createdAt: z.string().nullable().meta({ description: "Creation time." }),
	updatedAt: z.string().nullable().meta({ description: "Last update time." }),
});
