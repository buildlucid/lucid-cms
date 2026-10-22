export const ADAPTER_KEY = "node";
export const LUCID_VERSION = "0.x.x";

export default {
	/** Output path of the server entry, without an extension. */
	ENTRY: "server",
	/** Output path of the `lucid:build` module, which the worker queue loads in its own thread. */
	BUILD_MODULE: "lucid/build",
};
