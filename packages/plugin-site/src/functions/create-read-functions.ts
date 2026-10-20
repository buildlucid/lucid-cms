import type { SiteConfig } from "../site/create-site-config.js";
import createDocumentFunction from "./document.js";
import createDocumentListFunction from "./document-list.js";
import createDocumentPathsFunction from "./document-paths.js";
import createLocalesFunction from "./locales.js";
import createMediaFunction from "./media.js";
import createMediaListFunction from "./media-list.js";
import mediaUrl from "./media-url.js";

/** The built-in content reads, which site functions also receive under `functions`. */
const createReadFunctions = (config: SiteConfig) => ({
	document: createDocumentFunction(config),
	documentList: createDocumentListFunction(config),
	documentPaths: createDocumentPathsFunction(config),
	media: createMediaFunction(config),
	mediaList: createMediaListFunction(config),
	mediaUrl,
	locales: createLocalesFunction(config),
});

export type SiteReadFunctions = ReturnType<typeof createReadFunctions>;

export default createReadFunctions;
