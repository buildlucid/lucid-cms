import { getBaseUrl } from "../../../../utils/helpers/index.js";
import type { ServiceContext } from "../../../../utils/services/types.js";

/** Derives the relying party ID and origin from the CMS base URL. */
const getRelyingParty = (context: ServiceContext) => {
	const url = new URL(getBaseUrl(context));

	return {
		id: url.hostname,
		origin: url.origin,
		name: context.config.brand.name,
	};
};

export default getRelyingParty;
