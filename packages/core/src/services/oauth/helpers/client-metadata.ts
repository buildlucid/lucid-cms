import ipaddr from "ipaddr.js";
import constants from "../../../constants/constants.js";
import {
	type OAuthClientMetadata,
	oauthClientMetadataSchema,
} from "../../../schemas/oauth.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

export type { OAuthClientMetadata };

type ClientMetadataDocument = {
	body: string;
	contentType?: string;
};

const blockedHostnames = new Set([
	"localhost",
	"localhost.localdomain",
	"metadata.google.internal",
]);

const normalizeHostname = (hostname: string) =>
	hostname
		.replace(/^\[|\]$/g, "")
		.replace(/\.$/, "")
		.toLowerCase();

const getAddressRange = (hostname: string) => {
	if (!ipaddr.isValid(hostname)) return undefined;
	return ipaddr.process(hostname).range();
};

const isSafeMetadataUrl = (url: URL, allowedLoopbackHostname?: string) => {
	const hostname = normalizeHostname(url.hostname);
	const addressRange = getAddressRange(hostname);
	const allowedLoopbackUrl =
		allowedLoopbackHostname !== undefined &&
		hostname === normalizeHostname(allowedLoopbackHostname) &&
		isLoopbackHostname(hostname) &&
		(url.protocol === "http:" || url.protocol === "https:");

	return (
		(url.protocol === "https:" || allowedLoopbackUrl) &&
		url.username === "" &&
		url.password === "" &&
		url.search === "" &&
		url.hash === "" &&
		url.pathname !== "/" &&
		(allowedLoopbackUrl ||
			((addressRange === undefined || addressRange === "unicast") &&
				!blockedHostnames.has(hostname) &&
				!hostname.endsWith(".localhost") &&
				!hostname.endsWith(".localdomain") &&
				!hostname.endsWith(".local") &&
				!hostname.endsWith(".internal")))
	);
};

/**
 * Checks whether a hostname is a local loopback name or address.
 */
export const isLoopbackHostname = (value: string) => {
	const hostname = normalizeHostname(value);
	return (
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname === "::1" ||
		hostname.startsWith("127.")
	);
};

export const isSafeRedirectUri = (value: string) => {
	if (!URL.canParse(value)) return false;

	const url = new URL(value);
	if (url.hash || url.username || url.password) return false;
	if (url.protocol === "https:") return true;
	return url.protocol === "http:" && isLoopbackHostname(url.hostname);
};

const fetchClientMetadataDocument = async (
	url: URL,
): ServiceResponse<ClientMetadataDocument> => {
	try {
		const response = await fetch(url, {
			headers: {
				Accept: "application/json",
			},
			redirect: "error",
			signal: AbortSignal.timeout(constants.oauth.clientMetadataTimeoutMs),
		});
		if (response.status !== 200) {
			await response.body?.cancel().catch(() => undefined);
			return {
				error: {
					type: "basic",
					code: "invalid_client",
					status: 400,
				},
				data: undefined,
			};
		}

		const contentLength = Number(response.headers.get("content-length"));
		if (
			Number.isFinite(contentLength) &&
			contentLength > constants.oauth.clientMetadataMaxBytes
		) {
			await response.body?.cancel().catch(() => undefined);
			return {
				error: {
					type: "basic",
					code: "invalid_client",
					status: 400,
				},
				data: undefined,
			};
		}

		if (!response.body) {
			return {
				error: undefined,
				data: {
					body: "",
					contentType: response.headers.get("content-type") ?? undefined,
				},
			};
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let size = 0;
		let body = "";

		for (;;) {
			const chunk = await reader.read();
			if (chunk.done) break;

			size += chunk.value.byteLength;
			if (size > constants.oauth.clientMetadataMaxBytes) {
				await reader.cancel().catch(() => undefined);
				return {
					error: {
						type: "basic",
						code: "invalid_client",
						status: 400,
					},
					data: undefined,
				};
			}
			body += decoder.decode(chunk.value, { stream: true });
		}

		return {
			error: undefined,
			data: {
				body: body + decoder.decode(),
				contentType: response.headers.get("content-type") ?? undefined,
			},
		};
	} catch (cause) {
		return {
			error: {
				type: "basic",
				code: "invalid_client",
				status: 400,
				cause,
			},
			data: undefined,
		};
	}
};

/**
 * Fetches and validates OAuth client metadata from a public client ID URL.
 */
export const fetchOAuthClientMetadata = async (
	clientId: string,
	options: {
		allowedLoopbackHostname?: string;
	},
): ServiceResponse<OAuthClientMetadata> => {
	if (!URL.canParse(clientId)) {
		return {
			error: {
				type: "basic",
				code: "invalid_client",
				status: 400,
			},
			data: undefined,
		};
	}

	const metadataUrl = new URL(clientId);
	if (!isSafeMetadataUrl(metadataUrl, options.allowedLoopbackHostname)) {
		return {
			error: {
				type: "basic",
				code: "invalid_client",
				status: 400,
			},
			data: undefined,
		};
	}

	const response = await fetchClientMetadataDocument(metadataUrl);
	if (response.error) return response;

	const contentType = response.data.contentType
		?.split(";")[0]
		?.trim()
		.toLowerCase();
	if (
		contentType !== "application/json" &&
		!(contentType?.startsWith("application/") && contentType.endsWith("+json"))
	) {
		return {
			error: {
				type: "basic",
				code: "invalid_client",
				status: 400,
			},
			data: undefined,
		};
	}

	let document: unknown;
	try {
		document = JSON.parse(response.data.body);
	} catch (cause) {
		return {
			error: {
				type: "basic",
				code: "invalid_client",
				status: 400,
				cause,
			},
			data: undefined,
		};
	}

	const parsed = oauthClientMetadataSchema.safeParse(document);
	if (!parsed.success) {
		return {
			error: {
				type: "basic",
				code: "invalid_client",
				status: 400,
				cause: parsed.error,
			},
			data: undefined,
		};
	}
	if (parsed.data.client_id !== clientId) {
		return {
			error: {
				type: "basic",
				code: "invalid_client",
				status: 400,
			},
			data: undefined,
		};
	}
	if (
		parsed.data.grant_types &&
		!parsed.data.grant_types.includes("authorization_code")
	) {
		return {
			error: {
				type: "basic",
				code: "invalid_client",
				status: 400,
			},
			data: undefined,
		};
	}
	if (
		parsed.data.response_types &&
		!parsed.data.response_types.includes("code")
	) {
		return {
			error: {
				type: "basic",
				code: "invalid_client",
				status: 400,
			},
			data: undefined,
		};
	}
	if (
		parsed.data.token_endpoint_auth_method &&
		parsed.data.token_endpoint_auth_method !== "none"
	) {
		return {
			error: {
				type: "basic",
				code: "invalid_client",
				status: 400,
			},
			data: undefined,
		};
	}
	if (!parsed.data.redirect_uris.every(isSafeRedirectUri)) {
		return {
			error: {
				type: "basic",
				code: "invalid_client",
				status: 400,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: parsed.data,
	};
};
