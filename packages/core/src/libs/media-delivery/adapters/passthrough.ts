import type { MediaDeliveryAdapterInstance } from "../types.js";

/** Use Lucid's CDN without transforming the stored file. */
const passthroughMediaDeliveryAdapter = (): MediaDeliveryAdapterInstance => ({
	type: "media-delivery-adapter",
	key: "passthrough",
	resolveFile: () => ({ type: "lucid" }),
});

export default passthroughMediaDeliveryAdapter;
