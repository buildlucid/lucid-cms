import collections from "../../../libs/collection/collections.js";
import {
	getBricksTableSchema,
	getTableNames,
} from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { documentBricksFormatter } from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	DocumentBricksRepository,
	DocumentVersionsRepository,
} from "../../../libs/repositories/index.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import prepareDuplicateContent from "../../documents/helpers/prepare-duplicate-content.js";

/**
 * Reads one version's stored content in the document input shape, by version
 * ID or type. Returns null when the version does not exist. Hook transforms
 * are not applied.
 */
const readVersionContent: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			versionId?: number;
			versionType?: string;
		},
	],
	{
		id: number;
		type: string;
		contentId: string;
		content: { bricks: BrickInputSchema[]; fields: FieldInputSchema[] };
	} | null
> = async (context, data) => {
	const [collectionRes, tablesRes, schemaRes] = await Promise.all([
		collections.getSingle(context, { key: data.collectionKey }),
		getTableNames(context, data.collectionKey),
		getBricksTableSchema(context, data.collectionKey),
	]);
	if (collectionRes.error) return collectionRes;
	if (tablesRes.error) return tablesRes;
	if (schemaRes.error) return schemaRes;

	const Versions = new DocumentVersionsRepository(context.db);
	const DocumentBricks = new DocumentBricksRepository(context.db);

	const versionRes = await Versions.selectSingle(
		{
			select: ["id", "type", "content_id"],
			where: [
				{ key: "document_id", operator: "=", value: data.documentId },
				data.versionId !== undefined
					? { key: "id", operator: "=", value: data.versionId }
					: { key: "type", operator: "=", value: data.versionType ?? "latest" },
			],
		},
		{ tableName: tablesRes.data.version },
	);
	if (versionRes.error) return versionRes;
	if (!versionRes.data) return { error: undefined, data: null };

	const bricksRes = await DocumentBricks.selectMultipleByVersionId(
		{
			versionId: versionRes.data.id,
			documentId: data.documentId,
			bricksSchema: schemaRes.data,
		},
		{ tableName: tablesRes.data.version },
	);
	if (bricksRes.error) return bricksRes;
	if (!bricksRes.data) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.version.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const props = {
		bricksQuery: bricksRes.data,
		bricksSchema: schemaRes.data,
		collection: collectionRes.data,
		config: context.config,
		host: getBaseUrl(context),
		editable: true,
	};

	return {
		error: undefined,
		data: {
			id: versionRes.data.id,
			type: versionRes.data.type,
			contentId: versionRes.data.content_id,
			content: prepareDuplicateContent({
				fields: documentBricksFormatter.formatDocumentFields(props),
				bricks: documentBricksFormatter.formatMultiple(props),
			}),
		},
	};
};

export default readVersionContent;
