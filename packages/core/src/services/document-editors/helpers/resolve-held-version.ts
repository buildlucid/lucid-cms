import type { LucidActor } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import readDocumentState from "../../documents/helpers/read-document-state.js";
import resolveProposalVersion from "../../documents/helpers/resolve-proposal-version.js";

/** Resolves the tab's latest or request proposal to its current version ID, which can change after a save. */
const resolveHeldVersion: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			/** The request whose proposal is open, or null for latest. */
			requestId: number | null;
			user: LucidActor;
		},
	],
	number
> = async (context, data) => {
	if (data.requestId !== null) {
		return resolveProposalVersion(context, {
			requestId: data.requestId,
			collectionKey: data.collectionKey,
			documentId: data.documentId,
			user: data.user,
		});
	}

	const state = await readDocumentState(context, {
		collectionKey: data.collectionKey,
		id: data.documentId,
		allowWriteLock: true,
	});
	if (state.error) return state;

	return { error: undefined, data: state.data.version.id };
};

export default resolveHeldVersion;
