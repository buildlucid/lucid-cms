import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getRequestPath from "./get-request-path.js";

/** Builds an admin URL for a request or one of its documents. */
const getRequestLink = (
	context: ServiceContext,
	requestId: number,
	document?: { collectionKey: string; documentId: number },
) => new URL(getRequestPath(requestId, document), getBaseUrl(context)).href;

export default getRequestLink;
