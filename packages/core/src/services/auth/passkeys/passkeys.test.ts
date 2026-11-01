import crypto from "node:crypto";
import { isoBase64URL, isoCBOR } from "@simplewebauthn/server/helpers";
import { afterAll, beforeAll, expect, test } from "vitest";
import constants from "../../../constants/constants.js";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { UserPasskeysRepository } from "../../../libs/repositories/index.js";
import type { LucidAuth } from "../../../types/hono.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import deletePasskey from "../../account/delete-passkey.js";
import createUserToken from "../../user-tokens/create-single.js";
import resetPasskeys from "../../users/reset-passkeys.js";
import acceptInvitation from "../invitation/accept-invitation.js";
import createPasskeyOptions from "../invitation/create-passkey-options.js";
import confirmPasskey from "../two-factor/confirm-passkey.js";
import verifyPasskey from "../two-factor/verify-passkey.js";
import createLoginOptions from "./create-login-options.js";
import createRegistrationOptions from "./create-registration-options.js";
import login from "./login.js";
import register from "./register.js";

const testConfig = getTestConfig();
let context: ServiceContext;
afterAll(testConfig.destroy);

beforeAll(async () => {
	await testConfig.migrate();
	context = createServiceContext({
		config: await testConfig.getConfig(),
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
});

const site = new URL(constants.urls.localhost);
const appleAaguid = "fbfc3007-154e-4ecc-8c0b-6e020557d7bd";

const createUser = async (
	username: string,
	options?: { superAdmin?: boolean; locked?: boolean; invited?: boolean },
) => {
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${username}@test.local`,
			username,
			secret: "test",
			invitation_accepted: options?.invited !== true,
			super_admin: options?.superAdmin ?? false,
			is_locked: options?.locked ?? false,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	return user.id;
};

const authFor = (id: number, superAdmin: boolean): LucidAuth => ({
	id,
	username: `user-${id}`,
	email: `user-${id}@test.local`,
	superAdmin,
	permissions: [],
	exp: 0,
	iat: 0,
	nonce: "test",
	authTime: 0,
});

const sha256 = (data: Uint8Array | string) =>
	new Uint8Array(crypto.createHash("sha256").update(data).digest());

const uint32 = (value: number) => {
	const bytes = new Uint8Array(4);
	new DataView(bytes.buffer).setUint32(0, value);
	return bytes;
};

const clientData = (props: {
	type: "webauthn.create" | "webauthn.get";
	challenge: string;
	origin?: string;
}) =>
	new TextEncoder().encode(
		JSON.stringify({
			type: props.type,
			challenge: props.challenge,
			origin: props.origin ?? site.origin,
			crossOrigin: false,
		}),
	);

/** User present, user verified, backup eligible and backed up. */
const verifiedFlags = 0x01 | 0x04 | 0x08 | 0x10;

/**
 * A software passkey that answers the browser side of WebAuthn, signing with a
 * P-256 key like most platform authenticators. Each call to `get` counts up.
 */
const createAuthenticator = (options?: { aaguid?: string }) => {
	const keys = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
	const jwk = keys.publicKey.export({ format: "jwk" });
	const credentialId = crypto.randomBytes(16);
	let userHandle: string | undefined;

	return {
		id: isoBase64URL.fromBuffer(credentialId),
		create(props: {
			challenge: string;
			userHandle: string;
			origin?: string;
			rpId?: string;
		}) {
			userHandle = props.userHandle;
			const publicKey = isoCBOR.encode(
				new Map<number, number | Uint8Array>([
					[1, 2],
					[3, -7],
					[-1, 1],
					[-2, isoBase64URL.toBuffer(jwk.x ?? "")],
					[-3, isoBase64URL.toBuffer(jwk.y ?? "")],
				]),
			);
			const authData = Buffer.concat([
				sha256(props.rpId ?? site.hostname),
				Uint8Array.of(verifiedFlags | 0x40),
				uint32(0),
				Buffer.from(
					(options?.aaguid ?? appleAaguid).replaceAll("-", ""),
					"hex",
				),
				Uint8Array.of(0, credentialId.length),
				credentialId,
				publicKey,
			]);
			const attestationObject = isoCBOR.encode(
				new Map<string, string | Uint8Array | Map<string, never>>([
					["fmt", "none"],
					["attStmt", new Map()],
					["authData", new Uint8Array(authData)],
				]),
			);

			return {
				id: isoBase64URL.fromBuffer(credentialId),
				rawId: isoBase64URL.fromBuffer(credentialId),
				type: "public-key" as const,
				response: {
					clientDataJSON: isoBase64URL.fromBuffer(
						clientData({
							type: "webauthn.create",
							challenge: props.challenge,
							origin: props.origin,
						}),
					),
					attestationObject: isoBase64URL.fromBuffer(attestationObject),
					transports: ["internal", "hybrid"],
				},
				clientExtensionResults: {},
			};
		},
		get(props: {
			challenge: string;
			counter: number;
			flags?: number;
			origin?: string;
			/** Authenticators may leave the user handle out when the site names the passkeys. */
			omitUserHandle?: boolean;
		}) {
			const authData = Buffer.concat([
				sha256(site.hostname),
				Uint8Array.of(props.flags ?? verifiedFlags),
				uint32(props.counter),
			]);
			const clientDataJSON = clientData({
				type: "webauthn.get",
				challenge: props.challenge,
				origin: props.origin,
			});
			const signature = crypto.sign(
				"sha256",
				Buffer.concat([authData, sha256(clientDataJSON)]),
				keys.privateKey,
			);

			return {
				id: isoBase64URL.fromBuffer(credentialId),
				rawId: isoBase64URL.fromBuffer(credentialId),
				type: "public-key" as const,
				response: {
					clientDataJSON: isoBase64URL.fromBuffer(clientDataJSON),
					authenticatorData: isoBase64URL.fromBuffer(new Uint8Array(authData)),
					signature: isoBase64URL.fromBuffer(new Uint8Array(signature)),
					userHandle: props.omitUserHandle ? undefined : userHandle,
				},
				clientExtensionResults: {},
			};
		},
	};
};

/** Adds a passkey to the user's account the way the account page does. */
const addPasskey = async (
	userId: number,
	authenticator = createAuthenticator(),
) => {
	const optionsRes = await createRegistrationOptions(context, { userId });
	if (optionsRes.error) throw new Error("No registration options");

	const res = await register(context, {
		userId,
		response: authenticator.create({
			challenge: optionsRes.data.challenge,
			userHandle: optionsRes.data.user.id,
		}),
	});
	expect(res.error).toBeUndefined();
	return authenticator;
};

const loginOptions = async () => {
	const res = await createLoginOptions(context, {});
	if (res.error) throw new Error("No login options");
	return res.data;
};

test("a passkey is named after its provider, then signs in and records its use", async () => {
	const userId = await createUser("pk-login");
	const authenticator = await addPasskey(userId);

	const passkey = await context.db.kysely
		.selectFrom("lucid_user_passkeys")
		.select(["name", "backed_up", "transports", "last_used_at"])
		.where("user_id", "=", userId)
		.executeTakeFirstOrThrow();
	expect(passkey.name).toBe("Apple Passwords");
	expect(passkey.last_used_at).toBeNull();

	const options = await loginOptions();
	expect(options.userVerification).toBe("required");
	//* no account is named, so the browser offers every passkey it has for the site
	expect(options.allowCredentials).toBeUndefined();

	const res = await login(context, {
		response: authenticator.get({ challenge: options.challenge, counter: 1 }),
	});
	expect(res.data?.id).toBe(userId);

	const used = await context.db.kysely
		.selectFrom("lucid_user_passkeys")
		.select(["counter", "last_used_at"])
		.where("user_id", "=", userId)
		.executeTakeFirstOrThrow();
	expect(used.counter).toBe(1);
	expect(used.last_used_at).not.toBeNull();
});

test("a sign-in can't be replayed, as its challenge only works once", async () => {
	const userId = await createUser("pk-replay");
	const authenticator = await addPasskey(userId);
	const options = await loginOptions();
	const response = authenticator.get({
		challenge: options.challenge,
		counter: 0,
	});

	expect((await login(context, { response })).error).toBeUndefined();

	const replayRes = await login(context, { response });
	expect(replayRes.error?.code).toBe("passkey_expired");
});

test("a sign-in has to verify the user, and come from this site", async () => {
	const userId = await createUser("pk-checks");
	const authenticator = await addPasskey(userId);

	const presenceOnly = await login(context, {
		response: authenticator.get({
			challenge: (await loginOptions()).challenge,
			counter: 0,
			flags: 0x01,
		}),
	});
	expect(presenceOnly.error?.status).toBe(401);

	const otherSite = await login(context, {
		response: authenticator.get({
			challenge: (await loginOptions()).challenge,
			counter: 0,
			origin: "https://evil.test",
		}),
	});
	expect(otherSite.error?.status).toBe(401);
});

test("unknown passkeys say so, and locked users can't sign in", async () => {
	const unknownRes = await login(context, {
		response: createAuthenticator().get({
			challenge: (await loginOptions()).challenge,
			counter: 0,
		}),
	});
	expect(unknownRes.error?.code).toBe("passkey_unknown");

	const userId = await createUser("pk-locked");
	const authenticator = await addPasskey(userId);
	await context.db.kysely
		.updateTable("lucid_users")
		.set({ is_locked: true })
		.where("id", "=", userId)
		.execute();

	const lockedRes = await login(context, {
		response: authenticator.get({
			challenge: (await loginOptions()).challenge,
			counter: 0,
		}),
	});
	expect(lockedRes.error?.status).toBe(401);
});

test("setup challenges belong to the user they were made for", async () => {
	const ownerId = await createUser("pk-owner");
	const otherId = await createUser("pk-other");
	const optionsRes = await createRegistrationOptions(context, {
		userId: ownerId,
	});
	if (optionsRes.error) throw new Error("No registration options");

	const res = await register(context, {
		userId: otherId,
		response: createAuthenticator().create({
			challenge: optionsRes.data.challenge,
			userHandle: optionsRes.data.user.id,
		}),
	});
	expect(res.error?.code).toBe("passkey_expired");
});

test("a failed setup still uses up its challenge", async () => {
	const userId = await createUser("pk-failed-setup");
	const optionsRes = await createRegistrationOptions(context, { userId });
	if (optionsRes.error) throw new Error("No registration options");
	const authenticator = createAuthenticator();
	const props = {
		challenge: optionsRes.data.challenge,
		userHandle: optionsRes.data.user.id,
	};

	const wrongSiteRes = await register(context, {
		userId,
		response: authenticator.create({ ...props, origin: "https://evil.test" }),
	});
	expect(wrongSiteRes.error?.status).toBe(400);

	const retryRes = await register(context, {
		userId,
		response: authenticator.create(props),
	});
	expect(retryRes.error?.code).toBe("passkey_expired");
});

test("a passkey's counter never goes down", async () => {
	const userId = await createUser("pk-counter");
	await addPasskey(userId);
	const passkey = await context.db.kysely
		.selectFrom("lucid_user_passkeys")
		.select("id")
		.where("user_id", "=", userId)
		.executeTakeFirstOrThrow();

	const Passkeys = new UserPasskeysRepository(context.db);
	await Passkeys.recordLogin({ id: passkey.id, counter: 5, backedUp: true });
	await Passkeys.recordLogin({ id: passkey.id, counter: 3, backedUp: true });

	const stored = await context.db.kysely
		.selectFrom("lucid_user_passkeys")
		.select("counter")
		.where("id", "=", passkey.id)
		.executeTakeFirstOrThrow();
	expect(stored.counter).toBe(5);
});

test("setup excludes the user's passkeys and keeps one user handle", async () => {
	const userId = await createUser("pk-exclude");
	const authenticator = await addPasskey(userId);

	const optionsRes = await createRegistrationOptions(context, { userId });
	const user = await context.db.kysely
		.selectFrom("lucid_users")
		.select("passkey_user_id")
		.where("id", "=", userId)
		.executeTakeFirstOrThrow();

	expect(optionsRes.data?.user.id).toBe(user.passkey_user_id);
	expect(optionsRes.data?.excludeCredentials?.map((c) => c.id)).toEqual([
		authenticator.id,
	]);
	expect(optionsRes.data?.authenticatorSelection).toMatchObject({
		residentKey: "required",
		userVerification: "required",
	});
	expect(optionsRes.data?.pubKeyCredParams.map((p) => p.alg)).toEqual(
		constants.passkeys.algorithms,
	);
});

test("only super admins can reset a super admin's passkeys, and never their own", async () => {
	const adminId = await createUser("pk-admin");
	const superAdminId = await createUser("pk-super", { superAdmin: true });
	await addPasskey(superAdminId);

	const ownRes = await resetPasskeys(context, {
		auth: authFor(superAdminId, true),
		userId: superAdminId,
	});
	expect(ownRes.error?.status).toBe(400);

	const standardRes = await resetPasskeys(context, {
		auth: authFor(adminId, false),
		userId: superAdminId,
	});
	expect(standardRes.error?.status).toBe(403);

	const superRes = await resetPasskeys(context, {
		auth: authFor(await createUser("pk-super-two", { superAdmin: true }), true),
		userId: superAdminId,
	});
	expect(superRes.error).toBeUndefined();

	const remaining = await context.db.kysely
		.selectFrom("lucid_user_passkeys")
		.select("id")
		.where("user_id", "=", superAdminId)
		.execute();
	expect(remaining).toHaveLength(0);
});

const startTwoFactorStep = async (userId: number) => {
	const res = await createUserToken(context, {
		userId,
		tokenType: constants.userTokens.twoFactorChallenge,
		expiryDate: new Date(Date.now() + 600_000).toISOString(),
		authMethod: "password",
	});
	if (res.error) throw new Error("No two-factor challenge");
	return res.data.tokenId;
};

const readChallengeToken = (id: number) =>
	context.db.kysely
		.selectFrom("lucid_user_tokens")
		.select("consumed_at")
		.where("id", "=", id)
		.executeTakeFirstOrThrow();

const countEmails = async (to: string, template: string) => {
	const rows = await context.db.kysely
		.selectFrom("lucid_emails")
		.select("id")
		.where("template", "=", template)
		.where("to_address", "=", to)
		.execute();
	return rows.length;
};

const requireTwoFactor = async (userId: number, name: string) => {
	const role = await context.db.kysely
		.insertInto("lucid_roles")
		.values({ name, require_two_factor: true })
		.returning("id")
		.executeTakeFirstOrThrow();
	await context.db.kysely
		.insertInto("lucid_user_roles")
		.values({ user_id: userId, role_id: role.id })
		.execute();
};

test("a passkey answers a login's two-factor step, but only the user's own", async () => {
	const userId = await createUser("pk-2fa");
	const otherId = await createUser("pk-2fa-other");
	const own = await addPasskey(userId);
	const other = await addPasskey(otherId);
	const challengeId = await startTwoFactorStep(userId);

	const optionsRes = await createLoginOptions(context, { userId });
	expect(optionsRes.data?.allowCredentials?.map((c) => c.id)).toEqual([own.id]);

	const otherRes = await verifyPasskey(context, {
		challengeId,
		userId,
		response: other.get({
			challenge: optionsRes.data?.challenge ?? "",
			counter: 1,
		}),
	});
	expect(otherRes.error?.status).toBe(401);

	//* a challenge made for a normal sign-in can't answer the step
	const signInOptions = await loginOptions();
	const signInRes = await verifyPasskey(context, {
		challengeId,
		userId,
		response: own.get({ challenge: signInOptions.challenge, counter: 1 }),
	});
	expect(signInRes.error?.code).toBe("passkey_expired");

	//* the step names the user's passkeys, so the authenticator can leave the user handle out
	const stepOptions = await createLoginOptions(context, { userId });
	const res = await verifyPasskey(context, {
		challengeId,
		userId,
		response: own.get({
			challenge: stepOptions.data?.challenge ?? "",
			counter: 2,
			omitUserHandle: true,
		}),
	});
	expect(res.error).toBeUndefined();
	expect((await readChallengeToken(challengeId)).consumed_at).not.toBeNull();
});

test("a login's two-factor setup can add a passkey instead of an app, and emails the user", async () => {
	const userId = await createUser("pk-2fa-setup");
	const challengeId = await startTwoFactorStep(userId);
	const optionsRes = await createRegistrationOptions(context, { userId });
	if (optionsRes.error) throw new Error("No registration options");

	const res = await confirmPasskey(context, {
		challengeId,
		userId,
		response: createAuthenticator().create({
			challenge: optionsRes.data.challenge,
			userHandle: optionsRes.data.user.id,
		}),
	});
	expect(res.error).toBeUndefined();
	expect((await readChallengeToken(challengeId)).consumed_at).not.toBeNull();
	expect(
		await countEmails(
			"pk-2fa-setup@test.local",
			constants.email.templates.passkeyAdded.key,
		),
	).toBe(1);
});

test("an invitation can be accepted with a passkey instead of a password", async () => {
	const userId = await createUser("pk-invite", { invited: true });
	const tokenRes = await createUserToken(context, {
		userId,
		tokenType: constants.userTokens.invitation,
		expiryDate: new Date(Date.now() + 600_000).toISOString(),
	});
	if (tokenRes.error) throw new Error("No invitation");
	const token = tokenRes.data.token;

	const optionsRes = await createPasskeyOptions(context, { token });
	if (optionsRes.error) throw new Error("No invitation passkey options");

	const res = await acceptInvitation(context, {
		token,
		passkey: createAuthenticator().create({
			challenge: optionsRes.data.challenge,
			userHandle: optionsRes.data.user.id,
		}),
	});
	expect(res.data?.id).toBe(userId);

	const user = await context.db.kysely
		.selectFrom("lucid_users")
		.select(["invitation_accepted", "password"])
		.where("id", "=", userId)
		.executeTakeFirstOrThrow();
	expect(user).toEqual({ invitation_accepted: 1, password: null });

	const passkeys = await context.db.kysely
		.selectFrom("lucid_user_passkeys")
		.select("id")
		.where("user_id", "=", userId)
		.execute();
	expect(passkeys).toHaveLength(1);
	expect((await createPasskeyOptions(context, { token })).error?.status).toBe(
		404,
	);
});

test("when two-factor authentication is required, the last passkey stays unless there's an app", async () => {
	const userId = await createUser("pk-required");
	await requireTwoFactor(userId, "pk-required-role");
	await addPasskey(userId);
	const passkey = await context.db.kysely
		.selectFrom("lucid_user_passkeys")
		.select("id")
		.where("user_id", "=", userId)
		.executeTakeFirstOrThrow();

	const blockedRes = await deletePasskey(context, {
		userId,
		superAdmin: false,
		passkeyId: passkey.id,
	});
	expect(blockedRes.error?.status).toBe(400);

	await context.db.kysely
		.updateTable("lucid_users")
		.set({ two_factor_enabled_at: new Date().toISOString() })
		.where("id", "=", userId)
		.execute();
	const allowedRes = await deletePasskey(context, {
		userId,
		superAdmin: false,
		passkeyId: passkey.id,
	});
	expect(allowedRes.error).toBeUndefined();
});

test("a sign-in without a user handle is refused, as nothing else says whose passkey it is", async () => {
	const userId = await createUser("pk-no-handle");
	const authenticator = await addPasskey(userId);

	const res = await login(context, {
		response: authenticator.get({
			challenge: (await loginOptions()).challenge,
			counter: 1,
			omitUserHandle: true,
		}),
	});
	expect(res.error?.status).toBe(401);
});

test("the last passkey stays when it's the only way to log in, even with a link to a provider that's off", async () => {
	const userId = await createUser("pk-only-way-in");
	await addPasskey(userId);
	await context.db.kysely
		.insertInto("lucid_user_auth_providers")
		.values({
			user_id: userId,
			provider_key: "removed-provider",
			provider_user_id: "123",
		})
		.execute();
	const passkey = await context.db.kysely
		.selectFrom("lucid_user_passkeys")
		.select("id")
		.where("user_id", "=", userId)
		.executeTakeFirstOrThrow();

	const passkeyOnly: ServiceContext = {
		...context,
		config: {
			...context.config,
			auth: {
				...context.config.auth,
				password: { enabled: false },
				magicLink: { enabled: false },
			},
		},
	};
	const res = await deletePasskey(passkeyOnly, {
		userId,
		superAdmin: false,
		passkeyId: passkey.id,
	});
	expect(res.error?.status).toBe(400);
});
