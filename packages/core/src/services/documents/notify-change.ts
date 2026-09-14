import buildTableName from "../../libs/collection/helpers/build-table-name.js";
import type { ToolkitDocumentsNotifyChangeInput } from "../../libs/toolkit/documents/notify-change/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import notifyDependants from "../document-references/notify-dependants.js";
import emitDocumentChange from "./helpers/emit-change.js";

/** Reports persisted changes. Reference maintenance belongs to the write services. */
const notifyChange: ServiceFn<
	[ToolkitDocumentsNotifyChangeInput],
	undefined
> = async (context, data) => {
	const emitted = await emitDocumentChange(context, data);
	if (emitted.error || data.ids.length === 0) return emitted;

	const table = buildTableName(
		"document",
		{ collection: data.collectionKey },
		null,
	);
	if (table.error) return table;

	return notifyDependants(context, {
		resource: "documents",
		table: table.data.name,
		ids: data.ids,
		collectionKey: data.collectionKey,
		version:
			data.change && "version" in data.change ? data.change.version : undefined,
	});
};
export default notifyChange;
