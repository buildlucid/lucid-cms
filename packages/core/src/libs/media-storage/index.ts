import constants from "../../constants/constants.js";

export {
	destroyMediaStorageAdapter,
	getInitializedMediaStorageAdapter,
} from "./lifecycle.js";
export { splitBodyForProcessing, toNodeReadable } from "./normalize-body.js";
export {
	createSignedMediaToken,
	createSignedMediaUrl,
	validateSignedMediaUrl,
} from "./signed-url.js";

export const logScope = constants.logScopes.mediaStorageAdapter;
