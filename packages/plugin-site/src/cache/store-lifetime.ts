import { DEFAULT_STORE_LIFETIME_SECONDS } from "../constants.js";

/** The TTL for a stored page, island or fragment: the one asked for, capped at the default lifetime so KV doesn't grow without bound. */
const storeLifetime = (seconds: number | null | undefined) =>
	Math.min(
		seconds ?? DEFAULT_STORE_LIFETIME_SECONDS,
		DEFAULT_STORE_LIFETIME_SECONDS,
	);

export default storeLifetime;
