import type { RuntimeAdapter } from "@lucidcms/core/types";
import { ADAPTER_KEY } from "../constants.js";
import type { CloudflareRuntimeAdapter } from "../types.js";

/** Checks a project's runtime adapter is Cloudflare's, whose options Lucid's Worker settings come from. */
const isCloudflareAdapter = (
	adapter: RuntimeAdapter,
): adapter is CloudflareRuntimeAdapter =>
	adapter.key === ADAPTER_KEY && "getOptions" in adapter;

export default isCloudflareAdapter;
