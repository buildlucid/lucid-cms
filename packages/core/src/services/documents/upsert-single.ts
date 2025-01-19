import z from "zod";
import Repository from "../../libs/repositories/index.js";
import type { BrickSchema } from "../../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../../schemas/collection-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";

const upsertSingle: ServiceFn<
	[
		{
			collectionKey: string;
			userId: number;
			publish: boolean;

			documentId?: number;
			bricks?: Array<BrickSchema>;
			fields?: Array<FieldSchemaType>;
		},
	],
	number
> = async (context, data) => {
	// ----------------------------------------------
	// Checks

	const Document = Repository.get("documents", context.db, context.config.db);

	Document.upsertMultiple(
		{
			data: [],
		},
		{
			tableName: "lucid_document__fds",
			schema: z.object({
				test: z.boolean(),
			}),
		},
	);

	// Check collection exists

	// Check collection is locked

	// Check if document exists within the collection

	// Check if a single document already exists for this collection

	// ----------------------------------------------
	// Upsert document

	// ----------------------------------------------
	// Create and manage document versions

	return {
		error: undefined,
		data: 1,
	};
};

export default upsertSingle;
