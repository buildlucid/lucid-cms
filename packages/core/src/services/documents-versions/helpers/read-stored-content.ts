import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import {
	getBricksTableSchema,
	getTableNames,
} from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { documentBricksFormatter } from "../../../libs/formatters/index.js";
import { DocumentBricksRepository } from "../../../libs/repositories/index.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import prepareDuplicateContent from "../../documents/helpers/prepare-duplicate-content.js";

/**
 * Reads stored version content as document input without applying hook transforms.
 * @returns Null when the version has no stored content.
 */
const readStoredContent: ServiceFn<
	[
		{
			collection: CollectionBuilder;
			documentId: number;
			versionId: number;
		},
	],
	{ bricks: BrickInputSchema[]; fields: FieldInputSchema[] } | null
> = async (context, data) => {
	const [tablesRes, schemaRes] = await Promise.all([
		getTableNames(context, data.collection.key),
		getBricksTableSchema(context, data.collection.key),
	]);
	if (tablesRes.error) return tablesRes;
	if (schemaRes.error) return schemaRes;

	const DocumentBricks = new DocumentBricksRepository(context.db);

	const bricksRes = await DocumentBricks.selectMultipleByVersionId(
		{
			versionId: data.versionId,
			documentId: data.documentId,
			bricksSchema: schemaRes.data,
		},
		{ tableName: tablesRes.data.version },
	);
	if (bricksRes.error) return bricksRes;
	if (!bricksRes.data) return { error: undefined, data: null };

	const props = {
		bricksQuery: bricksRes.data,
		bricksSchema: schemaRes.data,
		collection: data.collection,
		config: context.config,
		host: getBaseUrl(context),
		editable: true,
	};

	return {
		error: undefined,
		data: prepareDuplicateContent({
			fields: documentBricksFormatter.formatDocumentFields(props),
			bricks: documentBricksFormatter.formatMultiple(props),
		}),
	};
};

export default readStoredContent;
