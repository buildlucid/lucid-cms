import { RequestDocumentsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** The collections each request's documents belong to, used to check who can read it. */
const requestCollections: ServiceFn<
	[{ requestIds: number[] }],
	Map<number, string[]>
> = async (context, input) => {
	if (input.requestIds.length === 0) {
		return { error: undefined, data: new Map() };
	}

	const RequestDocuments = new RequestDocumentsRepository(context.db);
	const documentsRes = await RequestDocuments.selectMultiple({
		select: ["request_id", "collection_key"],
		where: [{ key: "request_id", operator: "in", value: input.requestIds }],
		validation: { enabled: true },
	});
	if (documentsRes.error) return documentsRes;

	const collections = new Map<number, string[]>();
	for (const document of documentsRes.data) {
		const keys = collections.get(document.request_id) ?? [];
		if (!keys.includes(document.collection_key)) {
			keys.push(document.collection_key);
		}
		collections.set(document.request_id, keys);
	}

	return { error: undefined, data: collections };
};

export default requestCollections;
