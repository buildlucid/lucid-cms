import type { ReleaseBlocker } from "../../../types/response.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import type { ReleaseRecord, ReleaseState } from "../types.js";
import getDocumentBlockers from "./get-document-blockers.js";

const getBlockers = (
	context: ServiceContext,
	data: { release: ReleaseRecord; state: ReleaseState },
): ReleaseBlocker[] =>
	data.release.documents.flatMap((document) => {
		const state = data.state.get(document.id);
		if (!state) return [];

		return getDocumentBlockers(context, {
			release: data.release,
			document,
			state,
		}).map((blocker) => ({ ...blocker, releaseDocumentId: document.id }));
	});

export default getBlockers;
