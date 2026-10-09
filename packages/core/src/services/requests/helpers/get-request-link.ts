import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/** Builds an admin URL for a request or one of its documents. */
const getRequestLink = (
	context: ServiceContext,
	requestId: number,
	document?: { collectionKey: string; documentId: number },
) =>
	new URL(
		document
			? `/lucid/requests/${requestId}/content/${encodeURIComponent(document.collectionKey)}/${document.documentId}`
			: `/lucid/requests/${requestId}`,
		getBaseUrl(context),
	).href;

export default getRequestLink;
