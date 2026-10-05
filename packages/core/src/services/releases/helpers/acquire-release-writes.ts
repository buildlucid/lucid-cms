import { copy } from "../../../libs/i18n/index.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import acquireDocumentWrites from "../../documents/helpers/acquire-document-writes.js";
import type { ReleaseRecord } from "../types.js";
import loadRelease from "./load-release.js";
import lockRelease from "./lock-release.js";

/**
 * Claims every document in a stable order before the release, then rereads its
 * revision. Use inside a transaction with `await using`.
 */
const acquireReleaseWrites: ServiceFn<
	[
		{
			id: number;
			user?: LucidUser;
			/** Documents being added, which are claimed with the rest. */
			additionalDocuments?: Array<{
				collectionKey: string;
				documentId: number;
			}>;
		},
	],
	{ release: ReleaseRecord; claims: AsyncDisposableStack }
> = async (context, data) => {
	await using claims = new AsyncDisposableStack();

	const initialRes = await loadRelease(context, data);
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

	const lockRes = await lockRelease(context, { id: data.id });
	if (lockRes.error) return lockRes;

	claims.use(lockRes.data);

	//* reread once claimed, so callers see the revision no one else can now change
	const releaseRes = await loadRelease(context, data);
	if (releaseRes.error) return releaseRes;

	if (
		releaseRes.data.revision !== initial.revision ||
		releaseRes.data.status !== initial.status
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.review.changed"),
				status: 409,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: { release: releaseRes.data, claims: claims.move() },
	};
};

export default acquireReleaseWrites;
