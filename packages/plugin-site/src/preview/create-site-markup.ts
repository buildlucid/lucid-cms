import { CLIENT_SCRIPT_PATH } from "../constants.js";
import type { SitePreview } from "../types.js";
import type { PageMarkup } from "./page-markup.js";

/** The referrer policy and preview script previews add to a page, which loads Lucid's toolbar or the builder's runtime. */
const createSiteMarkup = (preview: SitePreview | null): PageMarkup =>
	preview
		? {
				head: '<meta name="referrer" content="no-referrer">',
				footer: `<script type="module" src="/${CLIENT_SCRIPT_PATH}"></script>`,
			}
		: { head: "", footer: "" };

export default createSiteMarkup;
