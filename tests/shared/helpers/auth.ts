import crypto from "node:crypto";
import type { TwoFactorStep } from "@lucidcms/core/types";
import {
	type Credentials,
	expectOk,
	IDENTITY_PARAMS,
	type OutboxEmail,
	type Session,
} from "#harness/client";

/** Asks for a new access token with the session's refresh token, as the admin app does when one expires. */
export const refreshSession = (session: Session) =>
	session.request({ method: "POST", path: "/api/v1/auth/token" });

/** The cookies a signed-in session holds. */
export const SESSION_COOKIES = ["_access", "_refresh"] as const;

/** The cookie that holds a login's two-factor step. */
export const TWO_FACTOR_COOKIE = "_two_factor";

/** Whether the session is signed in, by reading its account. */
export const isSignedIn = async (session: Session): Promise<boolean> =>
	(await session.request({ path: "/api/v1/account" })).status === 200;

/** The token in an emailed link, such as a magic link's `loginLink`. */
export const linkToken = (email: OutboxEmail, link: string): string => {
	const token = new URL(
		String(email.data[link]),
		"http://link",
	).searchParams.get("token");
	if (!token) {
		throw new Error(
			`The "${email.template}" email's ${link} has no token: ${String(email.data[link])}`,
		);
	}
	return token;
};

/** Sends a password login without retries, so a test sees exactly what the CMS answered. */
export const sendLogin = (
	session: Session,
	credentials: Pick<Credentials, "username" | "password">,
	headers?: Record<string, string>,
) =>
	session.request<{ data: { twoFactor: TwoFactorStep } }>({
		method: "POST",
		path: "/api/v1/auth/login",
		body: {
			usernameOrEmail: credentials.username,
			password: credentials.password,
		},
		headers,
	});

// ----------------------------------------------------------------------------
// Authenticator apps

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PERIOD_MS = 30_000;

const decodeBase32 = (value: string): Buffer => {
	let bits = "";
	for (const character of value.replaceAll("=", "").toUpperCase()) {
		const index = BASE32.indexOf(character);
		if (index === -1) {
			throw new Error(`"${value}" is not base32.`);
		}
		bits += index.toString(2).padStart(5, "0");
	}
	const bytes = bits.match(/.{8}/g) ?? [];
	return Buffer.from(bytes.map((byte) => Number.parseInt(byte, 2)));
};

/** Works out an RFC 6238 code for one 30 second step, separately from the CMS's own code. */
const codeForStep = (key: Buffer, step: number): string => {
	const counter = Buffer.alloc(8);
	counter.writeBigUInt64BE(BigInt(step));
	const hmac = crypto.createHmac("sha1", key).update(counter).digest();
	const offset = (hmac.at(-1) ?? 0) & 0x0f;
	return ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000)
		.toString()
		.padStart(6, "0");
};

/**
 * Generates codes from the CMS-provided secret, using each accepted time step once. Waits when
 * both currently valid steps are exhausted.
 */
export const createAuthenticatorApp = (secret: string) => {
	const key = decodeBase32(secret);
	let lastStep = Number.NEGATIVE_INFINITY;

	return {
		secret,
		code: async (): Promise<string> => {
			for (;;) {
				const current = Math.floor(Date.now() / PERIOD_MS);
				const step = Math.max(lastStep + 1, current);
				if (step <= current + 1) {
					lastStep = step;
					return codeForStep(key, step);
				}
				await new Promise((resolve) =>
					setTimeout(resolve, (step - 1) * PERIOD_MS - Date.now() + 50),
				);
			}
		},
		/** A well-formed code the CMS will refuse, from far outside its drift window. */
		wrongCode: (): string =>
			codeForStep(key, Math.floor(Date.now() / PERIOD_MS) + 100),
	};
};

export type AuthenticatorApp = ReturnType<typeof createAuthenticatorApp>;

/** Turns on two-factor authentication from the account page, after a recent login. */
export const enableTwoFactor = async (session: Session) => {
	const setup = await session.request<{ data: { secret: string } }>({
		method: "POST",
		path: "/api/v1/account/two-factor/setup",
		body: {},
	});
	expectOk("Starting two-factor setup", setup);

	const app = createAuthenticatorApp(setup.body.data.secret);
	const confirmed = await session.request<{
		data: { recoveryCodes: string[] };
	}>({
		method: "POST",
		path: "/api/v1/account/two-factor/confirm",
		body: { code: await app.code() },
	});
	expectOk("Confirming two-factor setup", confirmed);

	return { app, recoveryCodes: confirmed.body.data.recoveryCodes };
};

// ----------------------------------------------------------------------------
// Passkeys

type CborValue = number | string | Uint8Array | Map<number | string, CborValue>;

/** Encodes the few CBOR types WebAuthn's attestation and public keys use. */
const encodeCbor = (value: CborValue): Buffer => {
	const head = (major: number, length: number) => {
		if (length < 24) {
			return Buffer.from([(major << 5) | length]);
		}
		if (length < 256) {
			return Buffer.from([(major << 5) | 24, length]);
		}
		const bytes = Buffer.alloc(3);
		bytes.writeUInt8((major << 5) | 25);
		bytes.writeUInt16BE(length, 1);
		return bytes;
	};

	if (typeof value === "number") {
		return value >= 0 ? head(0, value) : head(1, -1 - value);
	}
	if (typeof value === "string") {
		const bytes = Buffer.from(value, "utf8");
		return Buffer.concat([head(3, bytes.length), bytes]);
	}
	if (value instanceof Uint8Array) {
		return Buffer.concat([head(2, value.length), value]);
	}
	return Buffer.concat([
		head(5, value.size),
		...[...value].flatMap(([key, item]) => [encodeCbor(key), encodeCbor(item)]),
	]);
};

const sha256 = (data: Uint8Array | string) =>
	crypto.createHash("sha256").update(data).digest();

const uint32 = (value: number) => {
	const bytes = Buffer.alloc(4);
	bytes.writeUInt32BE(value);
	return bytes;
};

/** User present, user verified, backup eligible and backed up. */
const VERIFIED_FLAGS = 0x01 | 0x04 | 0x08 | 0x10;
const ATTESTED_DATA_FLAG = 0x40;
/** Apple Passwords, which the CMS names passkeys after. */
const AAGUID = "fbfc3007154e4ecc8c0b6e020557d7bd";

/** What the CMS sends to start adding a passkey, as the browser receives it. */
export type RegistrationOptions = { challenge: string; user: { id: string } };

/**
 * A software passkey that answers the browser's side of WebAuthn for the CMS at `url`, signing
 * with a P-256 key like most platform authenticators. Each sign-in counts up.
 */
export const createPasskey = (url: string) => {
	const site = new URL(url);
	const keys = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
	const jwk = keys.publicKey.export({ format: "jwk" });
	const credentialId = crypto.randomBytes(16);
	const id = credentialId.toString("base64url");
	let userHandle: string | undefined;
	let counter = 0;

	const clientData = (type: string, challenge: string, origin: string) =>
		Buffer.from(
			JSON.stringify({ type, challenge, origin, crossOrigin: false }),
		).toString("base64url");

	return {
		id,
		/** Answers `navigator.credentials.create()` for the options the CMS sent. */
		create: (options: RegistrationOptions, overrides?: { origin?: string }) => {
			userHandle = options.user.id;
			const publicKey = encodeCbor(
				new Map<number, CborValue>([
					[1, 2],
					[3, -7],
					[-1, 1],
					[-2, Buffer.from(jwk.x ?? "", "base64url")],
					[-3, Buffer.from(jwk.y ?? "", "base64url")],
				]),
			);
			const authData = Buffer.concat([
				sha256(site.hostname),
				Buffer.from([VERIFIED_FLAGS | ATTESTED_DATA_FLAG]),
				uint32(0),
				Buffer.from(AAGUID, "hex"),
				Buffer.from([0, credentialId.length]),
				credentialId,
				publicKey,
			]);

			return {
				id,
				rawId: id,
				type: "public-key" as const,
				response: {
					clientDataJSON: clientData(
						"webauthn.create",
						options.challenge,
						overrides?.origin ?? site.origin,
					),
					attestationObject: encodeCbor(
						new Map<string, CborValue>([
							["fmt", "none"],
							["attStmt", new Map()],
							["authData", authData],
						]),
					).toString("base64url"),
					transports: ["internal", "hybrid"],
				},
				clientExtensionResults: {},
			};
		},
		/** Answers `navigator.credentials.get()` for a challenge the CMS sent. */
		get: (
			challenge: string,
			overrides?: { origin?: string; flags?: number },
		) => {
			counter++;
			const authData = Buffer.concat([
				sha256(site.hostname),
				Buffer.from([overrides?.flags ?? VERIFIED_FLAGS]),
				uint32(counter),
			]);
			const clientDataJSON = clientData(
				"webauthn.get",
				challenge,
				overrides?.origin ?? site.origin,
			);
			const signature = crypto.sign(
				"sha256",
				Buffer.concat([
					authData,
					sha256(Buffer.from(clientDataJSON, "base64url")),
				]),
				keys.privateKey,
			);

			return {
				id,
				rawId: id,
				type: "public-key" as const,
				response: {
					clientDataJSON,
					authenticatorData: authData.toString("base64url"),
					signature: signature.toString("base64url"),
					userHandle,
				},
				clientExtensionResults: {},
			};
		},
	};
};

export type Passkey = ReturnType<typeof createPasskey>;

/** Adds a passkey from the account page, after a recent login, and returns it. */
export const addPasskey = async (session: Session, url: string) => {
	const passkey = createPasskey(url);
	const options = await session.request<{ data: RegistrationOptions }>({
		method: "POST",
		path: "/api/v1/account/passkeys/options",
	});
	expectOk("Starting to add a passkey", options);

	const added = await session.request<{ data: { id: number; name: string } }>({
		method: "POST",
		path: "/api/v1/account/passkeys",
		body: passkey.create(options.body.data),
	});
	expectOk("Adding a passkey", added);
	return Object.assign(passkey, { recordId: added.body.data.id });
};

/** Signs in with a passkey from the login page, and returns the CMS's answer. */
export const signInWithPasskey = async (session: Session, passkey: Passkey) => {
	const options = await session.request<{ data: { challenge: string } }>({
		method: "POST",
		path: "/api/v1/auth/passkey/options",
	});
	expectOk("Starting a passkey sign-in", options);

	return session.request({
		method: "POST",
		path: "/api/v1/auth/passkey/login",
		body: passkey.get(options.body.data.challenge),
	});
};

// ----------------------------------------------------------------------------
// Providers

/** Who signs in at the harness's identity provider. */
export type ProviderIdentity = {
	subject: string;
	givenName?: string;
	familyName?: string;
	/** Refuse with this OAuth error instead, such as `access_denied`. */
	error?: string;
};

type ProviderSignIn = {
	provider: string;
	identity: ProviderIdentity;
	actionType?: "login" | "invitation" | "authenticated-link";
	invitationToken?: string;
	redirectPath?: string;
};

/**
 * Starts a provider sign-in and signs in at the identity provider as `identity`. Returns the
 * callback address the provider sends the browser back to, which `finishProviderSignIn` follows.
 */
export const startProviderSignIn = async (
	session: Session,
	options: ProviderSignIn,
): Promise<string> => {
	const initiated = await session.request<{ data: { redirectUrl: string } }>({
		method: "POST",
		path: `/api/v1/auth/providers/${options.provider}/initiate`,
		body: {
			actionType: options.actionType ?? "login",
			invitationToken: options.invitationToken,
			redirectPath: options.redirectPath,
		},
	});
	expectOk(`Starting a ${options.provider} sign-in`, initiated);

	const signIn = new URL(initiated.body.data.redirectUrl);
	const params = {
		[IDENTITY_PARAMS.subject]: options.identity.subject,
		[IDENTITY_PARAMS.givenName]: options.identity.givenName,
		[IDENTITY_PARAMS.familyName]: options.identity.familyName,
		[IDENTITY_PARAMS.error]: options.identity.error,
	};
	for (const [name, value] of Object.entries(params)) {
		if (value !== undefined) {
			signIn.searchParams.set(name, value);
		}
	}

	const atProvider = await fetch(signIn, { redirect: "manual" });
	const callback = new URL(atProvider.headers.get("location") ?? "");
	return `${callback.pathname}${callback.search}`;
};

/** Follows a provider's callback as `session`, and returns where the CMS sent the browser next. */
export const finishProviderSignIn = async (
	session: Session,
	callback: string,
): Promise<URL> => {
	const answered = await session.fetch(callback, { redirect: "manual" });
	const location = answered.headers.get("location");
	if (!location) {
		throw new Error(
			`The provider callback answered ${answered.status} without a redirect: ${await answered.text()}`,
		);
	}
	return new URL(location);
};

/**
 * Completes provider sign-in as `identity`, follows the CMS callback and returns the final
 * redirect.
 */
export const signInWithProvider = async (
	session: Session,
	options: ProviderSignIn,
): Promise<URL> =>
	finishProviderSignIn(session, await startProviderSignIn(session, options));
