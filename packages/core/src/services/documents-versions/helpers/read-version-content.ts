import collections from "../../../libs/collection/collections.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy } from "../../../libs/i18n/index.js";
import { DocumentVersionsRepository } from "../../../libs/repositories/index.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import readStoredContent from "./read-stored-content.js";

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
	const [collectionRes, tablesRes] = await Promise.all([
		collections.getSingle(context, { key: data.collectionKey }),
		getTableNames(context, data.collectionKey),
	]);
	if (collectionRes.error) return collectionRes;
	if (tablesRes.error) return tablesRes;

	const Versions = new DocumentVersionsRepository(context.db);

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

	const contentRes = await readStoredContent(context, {
		collection: collectionRes.data,
		documentId: data.documentId,
		versionId: versionRes.data.id,
	});
	if (contentRes.error) return contentRes;
	if (!contentRes.data) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.version.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			id: versionRes.data.id,
			type: versionRes.data.type,
			contentId: versionRes.data.content_id,
			content: contentRes.data,
		},
	};
};

export default readVersionContent;
