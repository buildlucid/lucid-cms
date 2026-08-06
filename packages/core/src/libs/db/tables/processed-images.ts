import z from "zod";
import { defineTable } from "../client/table/definition.js";

export const processedImagesTable = defineTable(
	"lucid_processed_images",
	() => ({
		columns: {
			key: {
				schema: z.string(),
				type: "text",
			},
			media_key: {
				schema: z.string(),
				type: "text",
			},
			file_size: {
				schema: z.number(),
				type: "integer",
			},
		},
	}),
);

export interface LucidProcessedImages {
	key: string;
	media_key: string | null;
	file_size: number;
}
