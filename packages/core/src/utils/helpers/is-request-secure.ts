import type { LucidHonoContext } from "../../types/hono.js";

/**
 * Parses an RFC 7239 Forwarded header and returns true when any entry declares
 * proto=https.
 */
const parseForwardedProto = (headerValue: string | undefined) => {
	if (!headerValue) return false;

	const entries = headerValue.split(",");
	for (const entry of entries) {
		const parts = entry.split(";");
		for (const part of parts) {
			const [key, value] = part.split("=");
			if (!key || !value) continue;
			if (key.trim().toLowerCase() !== "proto") continue;

			const normalized = value
				.trim()
				.replace(/^["']|["']$/g, "")
				.toLowerCase();
			return normalized === "https";
		}
	}

	return false;
};

/**
 * Determines whether the incoming request should be treated as HTTPS when
 * running directly or behind common reverse proxy headers.
 */
const isRequestSecure = (c: LucidHonoContext) => {
	if (c.req.url.startsWith("https://")) return true;
	if (!c.get("config").security.trustProxyHeaders) return false;

	if (parseForwardedProto(c.req.header("Forwarded"))) return true;

	const forwardedProto = c.req.header("X-Forwarded-Proto");
	if (forwardedProto) {
		const first = forwardedProto.split(",")[0]?.trim().toLowerCase();
		if (first === "https") return true;
	}

	const forwardedSsl = c.req.header("X-Forwarded-Ssl");
	if (forwardedSsl?.trim().toLowerCase() === "on") return true;

	const frontEndHttps = c.req.header("Front-End-Https");
	if (frontEndHttps?.trim().toLowerCase() === "on") return true;

	return false;
};

export default isRequestSecure;
