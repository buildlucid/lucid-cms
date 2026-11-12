import crypto from "node:crypto";
import {
	PROVIDER_CLIENT_SECRET,
	PROVIDERS,
} from "../../../shared/config/fragments/auth.ts";

/** Query parameters a test adds to a provider's sign-in address to say who signs in, or to refuse. */
export const IDENTITY_PARAMS = {
	subject: "harness_subject",
	givenName: "harness_given_name",
	familyName: "harness_family_name",
	/** An OAuth error to send back instead, such as `access_denied`. */
	error: "harness_error",
} as const;

type Authorization = {
	subject: string;
	givenName: string | null;
	familyName: string | null;
	clientId: string;
	redirectUri: string;
	codeChallenge: string;
	nonce: string | null;
	scope: string;
};

const escapeHtml = (value: string) =>
	value.replaceAll(
		/[&<>"']/g,
		(character) => `&#${character.codePointAt(0) ?? 0};`,
	);

const encodeJson = (value: object) =>
	Buffer.from(JSON.stringify(value)).toString("base64url");

/**
 * Test OAuth 2.0 and OpenID Connect provider under `issuer`, validating clients, redirects and
 * PKCE. `IDENTITY_PARAMS` selects the identity; otherwise shows a browser sign-in form.
 */
const createIdentityProvider = (issuer: string) => {
	const keys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
	const kid = crypto.randomUUID();
	const clients = new Set<string>(Object.values(PROVIDERS));
	//* codes and access tokens each work once and for one sign-in
	const codes = new Map<string, Authorization>();
	const accessTokens = new Map<string, Authorization>();

	const signIdToken = (authorization: Authorization) => {
		const now = Math.floor(Date.now() / 1000);
		const input = `${encodeJson({ alg: "RS256", typ: "JWT", kid })}.${encodeJson(
			{
				iss: issuer,
				sub: authorization.subject,
				aud: authorization.clientId,
				iat: now,
				exp: now + 300,
				nonce: authorization.nonce ?? undefined,
				given_name: authorization.givenName ?? undefined,
				family_name: authorization.familyName ?? undefined,
			},
		)}`;
		const signature = crypto.sign(
			"sha256",
			Buffer.from(input),
			keys.privateKey,
		);
		return `${input}.${signature.toString("base64url")}`;
	};

	const authorize = (url: URL): Response => {
		const params = url.searchParams;
		const clientId = params.get("client_id") ?? "";
		const redirectUri = params.get("redirect_uri");
		if (!clients.has(clientId) || !redirectUri) {
			return new Response("Unknown client or redirect.", { status: 400 });
		}

		const back = new URL(redirectUri);
		back.searchParams.set("state", params.get("state") ?? "");
		const error = params.get(IDENTITY_PARAMS.error);
		if (error) {
			back.searchParams.set("error", error);
			return Response.redirect(back, 302);
		}

		const subject = params.get(IDENTITY_PARAMS.subject);
		if (!subject) {
			const hidden = [...params]
				.map(
					([name, value]) =>
						`<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`,
				)
				.join("");
			return new Response(
				`<!doctype html><title>Harness Identity Provider</title><form method="get" action="authorize">${hidden}<label>Account <input name="${IDENTITY_PARAMS.subject}" required></label><button>Continue</button></form>`,
				{ headers: { "content-type": "text/html; charset=utf-8" } },
			);
		}

		const code = crypto.randomBytes(24).toString("base64url");
		codes.set(code, {
			subject,
			givenName: params.get(IDENTITY_PARAMS.givenName),
			familyName: params.get(IDENTITY_PARAMS.familyName),
			clientId,
			redirectUri,
			codeChallenge: params.get("code_challenge") ?? "",
			nonce: params.get("nonce"),
			scope: params.get("scope") ?? "",
		});
		back.searchParams.set("code", code);
		return Response.redirect(back, 302);
	};

	const token = async (request: Request): Promise<Response> => {
		const form = new URLSearchParams(await request.text());
		const code = form.get("code") ?? "";
		const authorization = codes.get(code);
		codes.delete(code);
		const challenge = crypto
			.createHash("sha256")
			.update(form.get("code_verifier") ?? "")
			.digest("base64url");

		if (
			!authorization ||
			form.get("grant_type") !== "authorization_code" ||
			form.get("client_id") !== authorization.clientId ||
			form.get("client_secret") !== PROVIDER_CLIENT_SECRET ||
			form.get("redirect_uri") !== authorization.redirectUri ||
			challenge !== authorization.codeChallenge
		) {
			return Response.json({ error: "invalid_grant" }, { status: 400 });
		}

		const accessToken = crypto.randomBytes(24).toString("base64url");
		accessTokens.set(accessToken, authorization);
		return Response.json({
			access_token: accessToken,
			token_type: "Bearer",
			expires_in: 3600,
			...(authorization.scope.split(" ").includes("openid")
				? { id_token: signIdToken(authorization) }
				: {}),
		});
	};

	const userInfo = (request: Request): Response => {
		const accessToken = request.headers
			.get("authorization")
			?.replace(/^Bearer /, "");
		const authorization = accessTokens.get(accessToken ?? "");
		if (!authorization) {
			return Response.json({ error: "invalid_token" }, { status: 401 });
		}
		return Response.json({
			sub: authorization.subject,
			given_name: authorization.givenName ?? undefined,
			family_name: authorization.familyName ?? undefined,
		});
	};

	/** Answers a request whose path is relative to the issuer, such as `/token`. */
	return async (request: Request, path: string): Promise<Response> => {
		switch (`${request.method} ${path}`) {
			case "GET /authorize":
				return authorize(new URL(request.url));
			case "POST /token":
				return token(request);
			case "GET /userinfo":
				return userInfo(request);
			case "GET /jwks":
				return Response.json({
					keys: [
						{
							...keys.publicKey.export({ format: "jwk" }),
							kid,
							alg: "RS256",
							use: "sig",
						},
					],
				});
			case "GET /.well-known/openid-configuration":
				return Response.json({
					issuer,
					authorization_endpoint: `${issuer}/authorize`,
					token_endpoint: `${issuer}/token`,
					jwks_uri: `${issuer}/jwks`,
					userinfo_endpoint: `${issuer}/userinfo`,
				});
			default:
				return new Response("Not found.", { status: 404 });
		}
	};
};

export default createIdentityProvider;
