import constants from "../../constants/constants.js";

export {
	destroyMediaAdapter,
	getInitializedMediaAdapter,
} from "./lifecycle.js";
export { splitBodyForProcessing, toNodeReadable } from "./normalize-body.js";
export {
	createSignedMediaToken,
	createSignedMediaUrl,
	validateSignedMediaUrl,
} from "./signed-url.js";

export const logScope = constants.logScopes.mediaAdapter;
