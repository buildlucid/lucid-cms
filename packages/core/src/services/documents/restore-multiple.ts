import { getTableNames } from "../../libs/collection/schema/live/schema-filters.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../types.js";
import { documentServices } from "../index.js";

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

	if (collectionRes.data.getData.config.isLocked) {
		return {
			error: {
				type: "basic",
				name: T("error_locked_collection_name"),
				message: T("error_locked_collection_message_delete"),
				status: 400,
			},
			data: undefined,
		};
	}

	const Documents = new DocumentsRepository(context.db, context.config.db);

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
				message: T("document_not_found_message"),
				errors: {
					ids: {
						message: T("only_found_ids_error_message", {
							ids: docsExistRes.data.map((d) => d.id).join(", "),
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

	return { error: undefined, data: undefined };
};

export default restoreMultiple;
