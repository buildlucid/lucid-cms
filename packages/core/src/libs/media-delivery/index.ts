import constants from "../../constants/constants.js";

export { default as passthroughMediaDeliveryAdapter } from "./adapters/passthrough.js";
export {
	destroyMediaDeliveryAdapter,
	getInitializedMediaDeliveryAdapter,
} from "./lifecycle.js";

export const logScope = constants.logScopes.mediaDeliveryAdapter;
