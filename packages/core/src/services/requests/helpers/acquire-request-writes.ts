import { copy } from "../../../libs/i18n/index.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import acquireDocumentWrites from "../../documents/helpers/acquire-document-writes.js";
import type { RequestRecord } from "../types.js";
import loadRequest from "./load-request.js";
import lockRequest from "./lock-request.js";

/** Claims captured documents and the request in a stable order within a transaction for use with `await using`. */
const acquireRequestWrites: ServiceFn<
	[
		{
			id: number;
			user?: LucidActor;
			/** Documents being added, which are claimed with the rest. */
			additionalDocuments?: Array<{
				collectionKey: string;
				documentId: number;
			}>;
		},
	],
	{ request: RequestRecord; claims: AsyncDisposableStack }
> = async (context, data) => {
	await using claims = new AsyncDisposableStack();

	const initialRes = await loadRequest(context, data);
	if (initialRes.error) return initialRes;

	const initial = initialRes.data;
	if (initial.status === "open") {
		const documents = [
			...initial.documents
				.filter((document) => document.source_version_id !== null)
				.map((document) => ({
					collectionKey: document.collection_key,
					documentId: document.document_id,
				})),
			...(data.additionalDocuments ?? []),
		];
		const byCollection = Map.groupBy(
			documents,
			(document) => document.collectionKey,
		);
		for (const collectionKey of [...byCollection.keys()].sort()) {
			const claimRes = await acquireDocumentWrites(context, {
				collectionKey,
				ids: (byCollection.get(collectionKey) ?? []).map(
					(document) => document.documentId,
				),
			});
			if (claimRes.error) return claimRes;

			claims.use(claimRes.data);
		}
	}

	const lockRes = await lockRequest(context, { id: data.id });
	if (lockRes.error) return lockRes;

	claims.use(lockRes.data);

	//* reread once claimed, so callers see the revision no one else can now change
	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	if (
		requestRes.data.revision !== initial.revision ||
		requestRes.data.status !== initial.status
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.review.changed"),
				status: 409,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: { request: requestRes.data, claims: claims.move() },
	};
};

export default acquireRequestWrites;
