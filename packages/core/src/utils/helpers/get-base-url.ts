import type { ServiceContext } from "../services/types.js";

/** Returns the CMS's base URL from `url`. Never derive it from the request, as Host headers can be forged. */
const getBaseUrl = (context: ServiceContext): string => context.config.url;

export default getBaseUrl;
