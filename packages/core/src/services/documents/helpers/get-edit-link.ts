import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/** Links to the admin editor route in `packages/admin/src/Router.tsx`, including the version ID for revisions. */
const getEditLink = (
	context: ServiceContext,
	collectionKey: string,
	version: string,
	id: number,
	versionId?: number,
) =>
	new URL(
		`/lucid/collections/${encodeURIComponent(collectionKey)}/${encodeURIComponent(version)}/${id}${versionId === undefined ? "" : `/${versionId}`}`,
		getBaseUrl(context),
	).href;

export default getEditLink;
