import type { FieldRefResource } from "../../libs/refs/types.js";
import { DocumentReferencesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import notifyDependants from "./notify-dependants.js";

/** After target deletion, notify owners before clearing direct reverse-reference entries.
 * Embedded identities remain because the author still has those nodes. */
const removeTarget: ServiceFn<
	[
		{
			resource: FieldRefResource;
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
