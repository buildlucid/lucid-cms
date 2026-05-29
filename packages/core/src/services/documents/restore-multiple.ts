import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { text } from "../../libs/i18n/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../types.js";
import { documentServices } from "../index.js";
import invalidateClientDocumentCache from "./helpers/invalidate-client-cache.js";

const restoreMultiple: ServiceFn<
	[
		{
			ids: number[];
			collectionKey: string;
		},
	],
	undefined
> = async (context, data) => {
	if (!data.ids || data.ids.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const collectionRes = await documentServices.checks.checkCollection(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (collectionRes.data.getData.config.locked) {
		return {
			error: {
				type: "basic",
				name: text.server("core.error.locked.collection.name"),
				message: text.server("core.error.locked.collection.message.delete"),
				status: 400,
			},
			data: undefined,
		};
	}

	const Documents = new DocumentsRepository(
		context.db.client,
		context.config.db,
	);

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const docsExistRes = await Documents.selectMultiple(
		{
			select: ["id"],
			where: [{ key: "id", operator: "in", value: data.ids }],
			validation: { enabled: true },
		},
		{ tableName: tableNamesRes.data.document },
	);
	if (docsExistRes.error) return docsExistRes;

	const existing = new Set(docsExistRes.data.map((r) => r.id));
	const missing = data.ids.filter((id) => !existing.has(id));
	const idsExist = missing.length === 0;
	if (!idsExist) {
		return {
			error: {
				type: "basic",
				message: text.server("core.documents.not.found.message"),
				errors: {
					ids: {
						message: text.server("core.documents.ids.not.found.partial", {
							data: {
								ids: docsExistRes.data.map((d) => d.id).join(", "),
							},
						}),
					},
				},
				status: 404,
			},
			data: undefined,
		};
	}

	const updateRes = await Documents.updateSingle(
		{
			data: {
				is_deleted: false,
				is_deleted_at: null,
			},
			where: [{ key: "id", operator: "in", value: data.ids }],
			returning: ["id"],
			validation: { enabled: true },
		},
		{ tableName: tableNamesRes.data.document },
	);
	if (updateRes.error) return updateRes;

	await invalidateClientDocumentCache(context, data.collectionKey);

	return { error: undefined, data: undefined };
};

export default restoreMultiple;
