import { redirectTargetTypes } from "../constants.js";
import type { RedirectIdentity } from "../types/types.js";
import redirectTargetPath from "./redirect-target-path.js";

/** Whether a web address target is the source path itself, even with a different query, fragment, case or trailing slash. */
const isDirectSelfRedirect = (identity: RedirectIdentity) =>
	identity.targetType === redirectTargetTypes.url &&
	identity.targetUrl !== null &&
	redirectTargetPath(identity.targetUrl) === identity.from;

export default isDirectSelfRedirect;
