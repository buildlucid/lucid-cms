import { HTML_CONTENT_TYPE } from "../constants.js";

/** The file a static build writes a page path to: HTML pages as `index.html` in their path's folder, other files at their path. */
const getPageFile = (routePath: string, contentType: string) =>
	contentType === HTML_CONTENT_TYPE
		? `${routePath.replace(/\/+$/, "")}/index.html`
		: routePath;

export default getPageFile;
