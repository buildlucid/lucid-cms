import constants from "../../constants/constants.js";

export { default as passthroughEmailAdapter } from "./adapters/passthrough.js";
export { default as isEmailSimulated } from "./is-simulated.js";
export {
	destroyEmailAdapter,
	getInitializedEmailAdapter,
} from "./lifecycle.js";

export const logScope = constants.logScopes.emailAdapter;
