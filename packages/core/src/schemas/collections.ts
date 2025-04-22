import z from "zod";
import CollectionsFormatter from "../libs/formatters/collections.js";
import type { ControllerSchema } from "../types.js";

const schema = {
	getSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			key: z.string().meta({
				description: "The collection key",
				example: "pages",
			}),
		}),
		response: CollectionsFormatter.schema.collection,
	} satisfies ControllerSchema,
	getAll: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.array(CollectionsFormatter.schema.collection),
	} satisfies ControllerSchema,
};

export default schema;
