import { DocumentHoldsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Releases a tab's document hold, such as when its editor closes. */
const leave: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			tabId: string;
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const Holds = new DocumentHoldsRepository(context.db);

	const deleted = await Holds.deleteMultiple({
		where: [
			{ key: "collection_key", operator: "=", value: data.collectionKey },
			{ key: "document_id", operator: "=", value: data.documentId },
			{ key: "tab_id", operator: "=", value: data.tabId },
			{ key: "user_id", operator: "=", value: data.userId },
		],
	});
	if (deleted.error) return deleted;

	return { error: undefined, data: undefined };
};

export default leave;
