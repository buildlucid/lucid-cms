import type { RefResource } from "../../exports/types.js";
import { DocumentReferencesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import notifyDependants from "./notify-dependants.js";

/** After target deletion, notify owners before removing native relationships.
 * Embedded identities remain because the author still has those nodes. */
const removeTarget: ServiceFn<
	[
		{
			resource: RefResource;
			table: string;
			ids: number[];
			collectionKey?: string;
		},
	],
	undefined
> = async (context, data) => {
	const notified = await notifyDependants(context, data);
	if (notified.error) return notified;
	const DocumentReferences = new DocumentReferencesRepository(context.db);
	return DocumentReferences.deleteDirectTargets(data);
};
export default removeTarget;
