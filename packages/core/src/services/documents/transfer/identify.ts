import { DocumentIdentitiesRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import parseDocumentId from "./helpers/parse-document-id.js";

/** Returns the uids of documents, keyed by their `<collectionKey>:<id>` ID. */
const identifyDocuments: ServiceFn<
	[{ ids: string[] }],
	Map<string, string>
> = async (context, data) => {
	const DocumentIdentities = new DocumentIdentitiesRepository(context.db);
	const byCollection = Map.groupBy(
		data.ids.flatMap((id) => parseDocumentId(id) ?? []),
		(ref) => ref.collectionKey,
	);

	const uids = new Map<string, string>();
	for (const [collectionKey, refs] of byCollection) {
		const identitiesRes = await DocumentIdentities.selectMultiple({
			select: ["document_id", "uid"],
			where: [
				{ key: "collection_key", operator: "=", value: collectionKey },
				{
					key: "document_id",
					operator: "in",
					value: refs.map((ref) => ref.id),
				},
			],
			validation: { enabled: true },
		});
		if (identitiesRes.error) return identitiesRes;

		for (const identity of identitiesRes.data) {
			uids.set(`${collectionKey}:${identity.document_id}`, identity.uid);
		}
	}

	return { error: undefined, data: uids };
};

export default identifyDocuments;
