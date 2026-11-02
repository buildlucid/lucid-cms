import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import {
	DocumentIdentitiesRepository,
	DocumentsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Returns `<collectionKey>:<id>` IDs for documents with the given uids, keyed by uid.
 * @remarks Leaves out deleted documents and documents waiting for their create request, as content can't link to them.
 */
const matchDocuments: ServiceFn<
	[{ uids: string[]; sameSite: boolean }],
	Map<string, string>
> = async (context, data) => {
	const matches = new Map<string, string>();
	if (data.uids.length === 0) return { error: undefined, data: matches };

	const DocumentIdentities = new DocumentIdentitiesRepository(context.db);
	const Documents = new DocumentsRepository(context.db);

	const identitiesRes = await DocumentIdentities.selectMultiple({
		select: ["collection_key", "document_id", "uid"],
		where: [{ key: "uid", operator: "in", value: data.uids }],
		validation: { enabled: true },
	});
	if (identitiesRes.error) return identitiesRes;

	const byCollection = Map.groupBy(
		identitiesRes.data,
		(identity) => identity.collection_key,
	);
	for (const [collectionKey, identities] of byCollection) {
		//* identities can outlive a collection removed from config
		const tablesRes = await getTableNames(context, collectionKey);
		if (tablesRes.error) continue;

		const documentsRes = await Documents.selectMultiple(
			{
				select: ["id"],
				where: [
					{
						key: "id",
						operator: "in",
						value: identities.map((identity) => identity.document_id),
					},
					{ key: "is_deleted", operator: "=", value: false },
					{ key: "create_request_id", operator: "is", value: null },
				],
				validation: { enabled: true },
			},
			{ tableName: tablesRes.data.document },
		);
		if (documentsRes.error) return documentsRes;

		const live = new Set(documentsRes.data.map((document) => document.id));
		for (const identity of identities) {
			if (!live.has(identity.document_id)) continue;
			matches.set(identity.uid, `${collectionKey}:${identity.document_id}`);
		}
	}

	return { error: undefined, data: matches };
};

export default matchDocuments;
