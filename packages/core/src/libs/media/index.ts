import constants from "../../constants/constants.js";

export { default as fileSystemMediaAdapter } from "./adapters/file-system/index.js";
export { splitBodyForProcessing, toNodeReadable } from "./normalize-body.js";
export {
	createSignedMediaToken,
	createSignedMediaUrl,
	validateSignedMediaUrl,
} from "./signed-url.js";

export const logScope = constants.logScopes.mediaAdapter;
