import z from "zod";
import { paginationSchema } from "../../../../libs/tools/pagination.js";
import {
	brickSchema,
	inputSchema as getDocumentInput,
} from "../../../documents/tools/get/schema.js";

export const inputSchema = getDocumentInput.pick({
	contentLocale: true,
	fieldKeys: true,
	bricksPage: true,
	bricksPerPage: true,
});

/** The document a builder tool worked on, as the screen names it. */
export const builderDocumentSchema = z.object({
	collectionKey: z.string(),
	documentId: z
		.number()
		.nullable()
		.meta({ description: "Null before the document is first saved." }),
	requestId: z.number().nullable(),
	name: z.string(),
});

export const outputSchema = z.object({
	document: builderDocumentSchema,
	unsaved: z
		.boolean()
		.meta({ description: "Whether the builder holds unsaved changes." }),
	editable: z.boolean().meta({
		description: "Whether the person can change the document right now.",
	}),
	contentLocale: z.string().nullable(),
	fields: z.record(z.string(), z.unknown()).meta({
		description:
			"Selected field values in the content language, in the shape documents_get returns.",
	}),
	bricks: z.array(brickSchema),
	brickPagination: paginationSchema,
	validationErrors: z.array(z.string()).meta({
		description: "Errors the builder would show on save.",
	}),
});
