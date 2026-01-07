import { createMiddleware } from "hono/factory";
import constants from "../../../constants/constants.js";
import T from "../../../translations/index.js";
import type { LucidHonoContext } from "../../../types.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import cacheKeys from "../../kv-adapter/cache-keys.js";

type RateLimitMode = "ip" | "user" | "client";

type RateLimitOptions = {
	/**
	 * What to use as the rate limit key
	 * - "ip": Client IP address (default)
	 * - "user": Authenticated user ID
	 * - "client": Client integration ID
	 */
	mode: RateLimitMode;
	/** Time window in milliseconds */
	windowMs: number;
	/** Maximum number of requests allowed within the window */
	limit: number;
	/**
	 * Custom key generator function. Takes precedence over mode when provided.
	 * Return a unique string identifier for the client.
	 */
	keyGenerator?: (c: LucidHonoContext) => string | Promise<string>;
	/**
	 * Function to skip rate limiting for certain requests.
	 * Return true to bypass rate limiting.
	 */
	skip?: (c: LucidHonoContext) => boolean | Promise<boolean>;
};

type RateLimitRecord = {
	count: number;
	resetTime: number;
};

const rateLimiter = (options: RateLimitOptions) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		if (options.skip && (await options.skip(c))) {
			await next();
			return;
		}

		const kv = c.get("kv");
		let key: string;

		if (options.keyGenerator) {
			const generatedKey = await options.keyGenerator(c);
			key = cacheKeys.rateLimit.record(generatedKey);
		} else {
			switch (options.mode) {
				case "user": {
					const auth = c.get("auth");
					if (!auth) {
						throw new LucidAPIError({
							type: "authorisation",
							code: "authorisation",
							message: T("rate_limit_authentication_required"),
							status: 401,
						});
					}
					key = cacheKeys.rateLimit.user(auth.id);
					break;
				}
				case "client": {
					const clientIntegration = c.get("clientIntegrationAuth");
					if (!clientIntegration) {
						throw new LucidAPIError({
							type: "authorisation",
							message: T("rate_limit_authentication_required"),
							status: 401,
						});
					}
					key = cacheKeys.rateLimit.client(clientIntegration.id);
					break;
				}
				default: {
					const runtimeContext = c.get("runtimeContext");
					const connectionInfo = runtimeContext.getConnectionInfo(c);
					if (!connectionInfo.address) {
						throw new LucidAPIError({
							type: "authorisation",
							message: T("rate_limit_ip_address_required"),
							status: 401,
						});
					}
					key = cacheKeys.rateLimit.ip(connectionInfo.address);
					break;
				}
			}
		}

		const now = Date.now();

		const existing = await kv.command.get<RateLimitRecord>(key);

		let record: RateLimitRecord;
		if (existing && existing.resetTime > now) {
			record = {
				count: existing.count + 1,
				resetTime: existing.resetTime,
			};
		} else {
			record = {
				count: 1,
				resetTime: now + options.windowMs,
			};
		}

		const ttl = Math.max(
			1,
			Math.ceil((record.resetTime - now) / 1000) +
				constants.rateLimit.ttlBufferSeconds,
		);
		await kv.command.set(key, record, { expirationTtl: ttl });

		const resetSeconds = Math.max(
			0,
			Math.ceil((record.resetTime - now) / 1000),
		);
		const remaining = Math.max(0, options.limit - record.count);

		c.header("RateLimit-Limit", options.limit.toString());
		c.header("RateLimit-Remaining", remaining.toString());
		c.header("RateLimit-Reset", resetSeconds.toString());

		if (record.count > options.limit) {
			c.header("Retry-After", resetSeconds.toString());

			throw new LucidAPIError({
				type: "rate_limit",
				code: "rate_limit",
				message: T("rate_limit_exceeded_message", { resetSeconds }),
				status: 429,
			});
		}

		await next();
	});

export default rateLimiter;
