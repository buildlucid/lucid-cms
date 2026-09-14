import buildTableName from "../../libs/collection/helpers/build-table-name.js";
import { DocumentReferencesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import notifyDependants from "./notify-dependants.js";

/** Collection removal/restoration changes the resolution of all incoming edges. */
const notifyCollection: ServiceFn<
	[{ collectionKey: string }],
	undefined
> = async (context, data) => {
	const table = buildTableName(
		"document",
		{ collection: data.collectionKey },
		null,
	);
	if (table.error) return table;

	const DocumentReferences = new DocumentReferencesRepository(context.db);
	let cursor = 0;
	while (true) {
		const targets = await DocumentReferences.selectCollectionTargets({
			table: table.data.name,
			afterId: cursor,
			limit: 250,
		});
		if (targets.error) return targets;
		if (targets.data.length === 0) return { error: undefined, data: undefined };

		const notified = await notifyDependants(context, {
			resource: "documents",
			table: table.data.name,
			collectionKey: data.collectionKey,
			ids: targets.data.map((row) => row.target_id),
		});
		if (notified.error) return notified;

		for (const row of targets.data) cursor = row.target_id;
	}
};
export default notifyCollection;
