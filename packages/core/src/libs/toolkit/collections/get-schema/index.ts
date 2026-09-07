import type z from "zod";
import type getSchema from "../../../../services/collections/get-schema.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitCollectionsGetSchemaInput = z.input<typeof inputSchema>;
/** Table names, columns and relationships available for custom database queries. */
export type ToolkitCollectionsGetSchemaResult = NonNullable<
	Awaited<ReturnType<typeof getSchema>>["data"]
>;

/** Describes a collection's database schema for custom queries. Does not create or migrate tables. */
const getCollectionSchema = (
	context: ServiceContext,
	input: ToolkitCollectionsGetSchemaInput,
): ServiceResponse<ToolkitCollectionsGetSchemaResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: getSchema } = await import(
				"../../../../services/collections/get-schema.js"
			);
			return getSchema(context, data);
		},
		name: {
			key: "core.toolkit.collections.get-schema.error.name",
		},
		message: {
			key: "core.toolkit.collections.get-schema.error.message",
		},
	});

export default getCollectionSchema;
