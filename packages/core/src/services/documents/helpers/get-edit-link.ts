import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getEditPath from "./get-edit-path.js";

/** Links to the admin editor, including the version ID for revisions. */
const getEditLink = (
	context: ServiceContext,
	collectionKey: string,
	version: string,
	id: number,
	versionId?: number,
) =>
	new URL(
		getEditPath(collectionKey, version, id, versionId),
		getBaseUrl(context),
	).href;

export default getEditLink;
