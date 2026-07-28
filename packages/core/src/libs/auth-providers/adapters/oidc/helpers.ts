import { Jwt } from "hono/utils/jwt";
import type { HonoJsonWebKey } from "hono/utils/jwt/jws";
import z from "zod";
import type { ServiceResponse } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import { OIDCDiscoverySchema } from "../../schema.js";
import type { OIDCAuthConfig } from "../../types.js";

type OIDCEndpoints = {
	tokenEndpoint: string;
	jwksEndpoint: string;
	userinfoEndpoint?: string;
	expectedIssuer: string;
};

type OIDCSigningKey = HonoJsonWebKey & {
	issuer?: string;
};

type VerifiedIdToken = {
	claims: Record<string, unknown>;
	signingKey: OIDCSigningKey;
};

const signingKeySchema = z
	.object({
		kid: z.string(),
		kty: z.string(),
		alg: z.string().optional(),
		use: z.string().optional(),
		key_ops: z.array(z.string()).optional(),
		crv: z.string().optional(),
		x: z.string().optional(),
		y: z.string().optional(),
		n: z.string().optional(),
		e: z.string().optional(),
		issuer: z.string().optional(),
	})
	.passthrough();

const signingKeysResponseSchema = z.object({
	keys: z.array(signingKeySchema),
});

const allowedAlgorithms = [
	"RS256",
	"RS384",
	"RS512",
	"PS256",
	"PS384",
	"PS512",
	"ES256",
	"ES384",
	"ES512",
	"EdDSA",
] as const;

const signingKeyCache = new Map<
	string,
	{ keys: OIDCSigningKey[]; expiresAt: number }
>();

const getDiscoveryUrl = (issuer: string) =>
	`${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;

export const resolveExpectedIssuer = (
	claims: Record<string, unknown>,
	expectedIssuer: string,
) => {
	if (!expectedIssuer.includes("{tenantid}")) {
		return expectedIssuer;
	}

	const tenantId = claims.tid;
	if (
		typeof tenantId !== "string" ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			tenantId,
		)
	) {
		return undefined;
	}

	return expectedIssuer.replace("{tenantid}", tenantId);
};

/**
 * Resolves OIDC endpoints from explicit configuration or provider discovery.
 */
export const resolveEndpoints = async (
	config: OIDCAuthConfig,
): ServiceResponse<OIDCEndpoints> => {
	if (config.tokenEndpoint && config.jwksEndpoint) {
		return {
			error: undefined,
			data: {
				tokenEndpoint: config.tokenEndpoint,
				jwksEndpoint: config.jwksEndpoint,
				userinfoEndpoint: config.userinfoEndpoint,
				expectedIssuer: config.issuer,
			},
		};
	}

	try {
		const response = await fetch(getDiscoveryUrl(config.issuer), {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(10_000),
		});
		if (!response.ok) {
			const message = `OIDC discovery returned HTTP ${response.status}.`;
			return {
				error: {
					type: "basic",
					status: response.status,
					message: copy.literal(message),
					cause: message,
				},
				data: undefined,
			};
		}

		const discovery = OIDCDiscoverySchema.safeParse(await response.json());
		if (!discovery.success) {
			return {
				error: {
					type: "basic",
					status: 502,
					message: copy.literal("OIDC discovery returned an invalid response."),
					cause: discovery.error,
				},
				data: undefined,
			};
		}

		if (
			discovery.data.issuer !== config.issuer &&
			(!discovery.data.issuer.includes("{tenantid}") ||
				new URL(discovery.data.issuer).origin !== new URL(config.issuer).origin)
		) {
			return {
				error: {
					type: "basic",
					status: 502,
					message: copy.literal(
						"OIDC discovery issuer does not match the provider config.",
					),
					cause: "OIDC discovery issuer does not match the provider config.",
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: {
				tokenEndpoint: config.tokenEndpoint ?? discovery.data.token_endpoint,
				jwksEndpoint: config.jwksEndpoint ?? discovery.data.jwks_uri,
				userinfoEndpoint:
					config.userinfoEndpoint ?? discovery.data.userinfo_endpoint,
				expectedIssuer: discovery.data.issuer,
			},
		};
	} catch (cause) {
		return {
			error: {
				type: "basic",
				status: 502,
				message: copy.literal("OIDC discovery failed."),
				cause,
			},
			data: undefined,
		};
	}
};

const fetchSigningKeys = async (
	endpoint: string,
	force = false,
): ServiceResponse<OIDCSigningKey[]> => {
	const cached = signingKeyCache.get(endpoint);
	if (!force && cached && cached.expiresAt > Date.now()) {
		return {
			error: undefined,
			data: cached.keys,
		};
	}

	try {
		const response = await fetch(endpoint, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(10_000),
		});
		if (!response.ok) {
			const message = `OIDC signing keys returned HTTP ${response.status}.`;
			return {
				error: {
					type: "basic",
					status: response.status,
					message: copy.literal(message),
					cause: message,
				},
				data: undefined,
			};
		}

		const parsed = signingKeysResponseSchema.safeParse(await response.json());
		if (!parsed.success) {
			return {
				error: {
					type: "basic",
					status: 502,
					message: copy.literal(
						"OIDC signing keys returned an invalid response.",
					),
					cause: parsed.error,
				},
				data: undefined,
			};
		}

		const keys = parsed.data.keys as OIDCSigningKey[];
		signingKeyCache.set(endpoint, {
			keys,
			expiresAt: Date.now() + 5 * 60 * 1000,
		});

		return {
			error: undefined,
			data: keys,
		};
	} catch (cause) {
		return {
			error: {
				type: "basic",
				status: 502,
				message: copy.literal("OIDC signing keys could not be loaded."),
				cause,
			},
			data: undefined,
		};
	}
};

const verifyWithKeys = async (
	idToken: string,
	keys: OIDCSigningKey[],
	clientId: string,
	header: ReturnType<typeof Jwt.decode>["header"],
): ServiceResponse<VerifiedIdToken> => {
	if (
		!allowedAlgorithms.some((algorithm) => algorithm === header.alg) ||
		!header.alg
	) {
		return {
			error: {
				type: "basic",
				status: 401,
				message: copy.literal("OIDC ID token algorithm is not allowed."),
				cause: "OIDC ID token algorithm is not allowed.",
			},
			data: undefined,
		};
	}

	const candidates = header.kid
		? keys.filter((key) => key.kid === header.kid)
		: keys.length === 1
			? keys
			: [];

	for (const key of candidates) {
		if (
			(key.alg && key.alg !== header.alg) ||
			(key.use && key.use !== "sig") ||
			(key.key_ops && !key.key_ops.includes("verify"))
		) {
			continue;
		}

		try {
			const claims = await Jwt.verify(idToken, key, {
				alg: header.alg,
				aud: clientId,
				exp: false,
				iat: false,
				nbf: false,
			});
			return {
				error: undefined,
				data: {
					claims,
					signingKey: key,
				},
			};
		} catch {}
	}

	return {
		error: {
			type: "basic",
			status: 401,
			message: copy.literal("OIDC ID token verification failed."),
			cause: "OIDC ID token verification failed.",
		},
		data: undefined,
	};
};

const claimsAreCurrent = (claims: Record<string, unknown>) => {
	const now = Math.floor(Date.now() / 1000);
	const tolerance = 5;

	if (
		typeof claims.exp !== "number" ||
		typeof claims.iat !== "number" ||
		claims.exp <= now - tolerance ||
		claims.iat > now + tolerance ||
		now - claims.iat > 10 * 60 + tolerance
	) {
		return false;
	}

	return (
		claims.nbf === undefined ||
		(typeof claims.nbf === "number" && claims.nbf <= now + tolerance)
	);
};

const signingKeyIssuerMatches = (
	key: OIDCSigningKey | undefined,
	claims: Record<string, unknown>,
	expectedIssuer: string,
) => {
	if (!expectedIssuer.includes("{tenantid}")) return true;
	if (!key?.issuer || typeof claims.iss !== "string") return false;

	return resolveExpectedIssuer(claims, key.issuer) === claims.iss;
};

/**
 * Verifies an OIDC ID token and its protocol claims against provider metadata.
 */
export const verifyIdToken = async (
	idToken: string,
	config: OIDCAuthConfig,
	endpoints: OIDCEndpoints,
	nonce: string,
): ServiceResponse<VerifiedIdToken> => {
	let decoded: ReturnType<typeof Jwt.decode>;
	try {
		decoded = Jwt.decode(idToken);
	} catch (cause) {
		return {
			error: {
				type: "basic",
				status: 401,
				message: copy.literal("OIDC ID token could not be decoded."),
				cause,
			},
			data: undefined,
		};
	}

	let keysRes = await fetchSigningKeys(endpoints.jwksEndpoint);
	if (keysRes.error) return keysRes;

	let verified = await verifyWithKeys(
		idToken,
		keysRes.data,
		config.clientId,
		decoded.header,
	);
	if (verified.error) {
		keysRes = await fetchSigningKeys(endpoints.jwksEndpoint, true);
		if (keysRes.error) return keysRes;
		verified = await verifyWithKeys(
			idToken,
			keysRes.data,
			config.clientId,
			decoded.header,
		);
	}
	if (verified.error) return verified;

	const claims = verified.data.claims;
	const expectedIssuer = resolveExpectedIssuer(
		claims,
		endpoints.expectedIssuer,
	);
	const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];

	if (
		claims.iss !== expectedIssuer ||
		!signingKeyIssuerMatches(
			verified.data.signingKey,
			claims,
			endpoints.expectedIssuer,
		) ||
		claims.nonce !== nonce ||
		typeof claims.sub !== "string" ||
		!claimsAreCurrent(claims) ||
		(claims.azp !== undefined && claims.azp !== config.clientId) ||
		(audiences.length > 1 && claims.azp !== config.clientId)
	) {
		return {
			error: {
				type: "basic",
				status: 401,
				message: copy.literal("OIDC ID token claims are invalid."),
				cause: "OIDC ID token claims are invalid.",
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: verified.data,
	};
};
