import type CollectionDefinition from "../../../libs/collection/definitions/collection/index.js";
import resolveCollectionLocalization from "../../../libs/collection/helpers/resolve-collection-localization.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy } from "../../../libs/i18n/index.js";
import { DocumentVersionsRepository } from "../../../libs/repositories/index.js";
import mergeLocaleContent from "../../../libs/translations/merge-locale-content.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkValidateBricksFields from "../../documents-bricks/checks/check-validate-bricks-fields.js";
import readStoredContent from "./read-stored-content.js";

/**
 * Merges requested locales into current latest, preserving other edits. Revalidates because latest
 * may have changed since approval.
 */
const landLocaleContent: ServiceFn<
	[
		{
			collection: CollectionDefinition;
			documentId: number;
			fromVersionId: number;
			locales: string[];
		},
	],
	{ bricks: BrickInputSchema[]; fields: FieldInputSchema[] }
> = async (context, data) => {
	const tablesRes = await getTableNames(context, data.collection.key);
	if (tablesRes.error) return tablesRes;

	const Versions = new DocumentVersionsRepository(context.db);
	const latestRes = await Versions.selectSingle(
		{
			select: ["id"],
			where: [
				{ key: "document_id", operator: "=", value: data.documentId },
				{ key: "type", operator: "=", value: "latest" },
			],
			validation: {
				enabled: true,
				defaultError: {
					message: copy("server:core.documents.version.not.found.message"),
					status: 404,
				},
			},
		},
		{ tableName: tablesRes.data.version },
	);
	if (latestRes.error) return latestRes;

	const [latestContentRes, sourceContentRes] = await Promise.all([
		readStoredContent(context, {
			collection: data.collection,
			documentId: data.documentId,
			versionId: latestRes.data.id,
		}),
		readStoredContent(context, {
			collection: data.collection,
			documentId: data.documentId,
			versionId: data.fromVersionId,
		}),
	]);
	if (latestContentRes.error) return latestContentRes;
	if (sourceContentRes.error) return sourceContentRes;
	//* landing on anything else would write more than the request's locales
	if (!latestContentRes.data || !sourceContentRes.data) {
		return {
			error: {
				status: 404,
				message: copy("server:core.documents.version.not.found.message"),
			},
			data: undefined,
		};
	}

	const landed = mergeLocaleContent({
		collection: data.collection,
		localization: resolveCollectionLocalization({
			localization: context.config.localization,
			collection: data.collection,
		}),
		target: latestContentRes.data,
		source: sourceContentRes.data,
		locales: data.locales,
	});

	const validateRes = await checkValidateBricksFields(context, {
		collection: data.collection,
		bricks: landed.bricks,
		fields: landed.fields,
		existingVersion: {
			id: latestRes.data.id,
			documentId: data.documentId,
		},
		locales: data.locales,
	});
	if (validateRes.error) return validateRes;

	return { error: undefined, data: landed };
};

export default landLocaleContent;
