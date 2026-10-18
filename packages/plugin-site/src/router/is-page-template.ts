import { PAGES_DIRECTORY, TEMPLATE_EXTENSION } from "../constants.js";

/** Templates in `pages/` route, except those in or named with a leading `_`. */
const isPageTemplate = (name: string) =>
	name.startsWith(`${PAGES_DIRECTORY}/`) &&
	name.endsWith(TEMPLATE_EXTENSION) &&
	!name.split("/").some((segment) => segment.startsWith("_"));

export default isPageTemplate;
