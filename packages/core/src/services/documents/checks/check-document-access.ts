import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy } from "../../../libs/i18n/index.js";
import { DocumentsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Checks document existence before writes, excluding create-request documents with `pending: false` and binned documents with `deleted: false`. */
const checkDocumentAccess: ServiceFn<
	[
		{
			collectionKey: string;
			id?: number;
			ids?: number[];
			pending?: false;
			deleted?: false;
		},
	],
	undefined
> = async (context, data) => {
	const ids = Array.from(
		new Set(data.ids ?? (data.id !== undefined ? [data.id] : [])),
	);

	if (ids.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const Documents = new DocumentsRepository(context.db);

	const documentsRes = await Documents.selectMultipleValidationIds(
		{
			ids,
			pending: data.pending,
			isDeleted:
				data.deleted === false
					? context.config.db.getDefault("boolean", "false")
					: undefined,
			validation: {
				enabled: true,
			},
		},
		{
			tableName: tableNamesRes.data.document,
		},
	);
	if (documentsRes.error) return documentsRes;

	if (documentsRes.data.length !== ids.length) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkDocumentAccess;
