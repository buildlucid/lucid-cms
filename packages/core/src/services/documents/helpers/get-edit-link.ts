import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/** Links to the admin document editor route defined in packages/admin/src/Router.tsx. */
const getEditLink = (
	context: ServiceContext,
	collectionKey: string,
	version: string,
	id: number,
) =>
	new URL(
		`/lucid/collections/${encodeURIComponent(collectionKey)}/${encodeURIComponent(version)}/${id}`,
		getBaseUrl(context),
	).href;

export default getEditLink;
