import crypto from "node:crypto";
import { afterAll, beforeAll, expect, test } from "vitest";
import constants from "../../../constants/constants.js";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import type { LucidAuth } from "../../../types/hono.js";
import { decrypt } from "../../../utils/helpers/encrypt-decrypt.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import disableTwoFactor from "../../account/disable-two-factor.js";
import startTwoFactorSetup from "../../account/start-two-factor-setup.js";
import createUserToken from "../../user-tokens/create-single.js";
import resetTwoFactor from "../../users/reset-two-factor.js";
import activateSecret from "./activate-secret.js";
import checkProof from "./check-proof.js";
import createSecret from "./create-secret.js";
import { matchTotpCode } from "./helpers/totp.js";
import isRequired from "./is-required.js";
import verifyChallenge from "./verify-challenge.js";

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

/** Works out an authenticator code separately from the code under test. */
const totp = (secret: Buffer, time = Date.now()) => {
	const counter = Buffer.alloc(8);
	counter.writeBigUInt64BE(BigInt(Math.floor(time / 30_000)));
	const hmac = crypto.createHmac("sha1", secret).update(counter).digest();
	const binary = hmac.readUInt32BE(hmac.readUInt8(19) & 0xf) & 0x7fffffff;
	return (binary % 1_000_000).toString().padStart(6, "0");
};

const createUser = async (username: string, superAdmin = false) => {
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${username}@test.local`,
			username,
			secret: "test",
			invitation_accepted: true,
			super_admin: superAdmin,
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
});

/** Reads the user's pending secret, as the authenticator app would from the QR code. */
const readPendingSecret = async (userId: number) => {
	const user = await context.db.kysely
		.selectFrom("lucid_users")
		.select("two_factor_pending_secret")
		.where("id", "=", userId)
		.executeTakeFirstOrThrow();
	return Buffer.from(
		decrypt(
			user.two_factor_pending_secret ?? "",
			context.config.secrets.encryption,
		),
		"hex",
	);
};

/** Turns on two-factor authentication, returning the app's secret and the recovery codes. */
const enable = async (userId: number) => {
	expect((await createSecret(context, { userId })).error).toBeUndefined();
	const secret = await readPendingSecret(userId);
	const res = await activateSecret(context, { userId, code: totp(secret) });
	expect(res.error).toBeUndefined();
	return { secret, recoveryCodes: res.data?.recoveryCodes ?? [] };
};

/** The next code, as the one used to turn it on can't be used again. */
const nextCode = (secret: Buffer) => totp(secret, Date.now() + 30_000);

const startChallenge = async (userId: number) => {
	const res = await createUserToken(context, {
		userId,
		tokenType: constants.userTokens.twoFactorChallenge,
		expiryDate: new Date(Date.now() + 600_000).toISOString(),
		authMethod: "password",
	});
	return res.data?.tokenId ?? 0;
};

test("authenticator codes match RFC 6238's test values, with one step of drift either way", () => {
	const secret = Buffer.from("12345678901234567890");

	expect(
		matchTotpCode({ secret, code: "287082", lastStep: null, time: 59_000 }),
	).toBe(1);
	expect(
		matchTotpCode({
			secret,
			code: "081804",
			lastStep: null,
			time: 1_111_111_109_000,
		}),
	).toBe(37_037_036);
	expect(
		matchTotpCode({
			secret,
			code: "005924",
			lastStep: null,
			time: 1_234_567_890_000,
		}),
	).toBe(41_152_263);
	expect(
		matchTotpCode({
			secret,
			code: "279037",
			lastStep: null,
			time: 2_000_000_000_000,
		}),
	).toBe(66_666_666);

	expect(
		matchTotpCode({ secret, code: "287082", lastStep: null, time: 89_000 }),
	).toBe(1);
	expect(
		matchTotpCode({ secret, code: "287082", lastStep: null, time: 119_000 }),
	).toBeNull();
	expect(
		matchTotpCode({ secret, code: "287082", lastStep: 1, time: 59_000 }),
	).toBeNull();
});

test("setting up needs a code from the new app, then gives ten recovery codes", async () => {
	const userId = await createUser("tf-setup");
	const setupRes = await createSecret(context, { userId });
	expect(setupRes.data?.secret).toMatch(/^[A-Z2-7]{32}$/);
	expect(setupRes.data?.uri).toBe(
		`otpauth://totp/Lucid%20CMS:tf-setup%40test.local?secret=${setupRes.data?.secret}&issuer=Lucid%20CMS`,
	);

	const secret = await readPendingSecret(userId);
	const wrongCode = totp(secret) === "000000" ? "111111" : "000000";
	expect(
		(await activateSecret(context, { userId, code: wrongCode })).error?.status,
	).toBe(401);

	const res = await activateSecret(context, { userId, code: totp(secret) });
	expect(res.data?.recoveryCodes).toHaveLength(
		constants.twoFactor.recoveryCodeCount,
	);
	for (const code of res.data?.recoveryCodes ?? []) {
		expect(code).toMatch(/^[0-9a-hjkmnp-tv-z]{5}-[0-9a-hjkmnp-tv-z]{5}$/);
	}

	const user = await context.db.kysely
		.selectFrom("lucid_users")
		.select(["two_factor_enabled_at", "two_factor_pending_secret"])
		.where("id", "=", userId)
		.executeTakeFirstOrThrow();
	expect(user.two_factor_enabled_at).not.toBeNull();
	expect(user.two_factor_pending_secret).toBeNull();

	const storedCodes = await context.db.kysely
		.selectFrom("lucid_user_recovery_codes")
		.select("code")
		.where("user_id", "=", userId)
		.execute();
	expect(storedCodes.map((row) => row.code)).not.toContain(
		res.data?.recoveryCodes[0],
	);
});

test("authenticator and recovery codes only work once", async () => {
	const userId = await createUser("tf-once");
	const { secret, recoveryCodes } = await enable(userId);

	//* the code that turned it on was used up then
	expect(
		(await checkProof(context, { userId, proof: { code: totp(secret) } })).error
			?.status,
	).toBe(401);

	const code = nextCode(secret);
	expect(await checkProof(context, { userId, proof: { code } })).toEqual({
		error: undefined,
		data: undefined,
	});
	expect(
		(await checkProof(context, { userId, proof: { code } })).error?.status,
	).toBe(401);

	//* recovery codes ignore case, spaces and dashes
	const recoveryCode = ` ${recoveryCodes[0]?.toUpperCase().replace("-", "")} `;
	expect(
		await checkProof(context, { userId, proof: { recoveryCode } }),
	).toEqual({
		error: undefined,
		data: undefined,
	});
	expect(
		(await checkProof(context, { userId, proof: { recoveryCode } })).error
			?.status,
	).toBe(401);
});

test("each login allows five entries, and each account ten wrong entries an hour", async () => {
	const userId = await createUser("tf-limits");
	const { secret } = await enable(userId);
	const wrongProof = { recoveryCode: "wrong-code" };

	const first = await startChallenge(userId);
	for (let i = 0; i < constants.twoFactor.maxChallengeAttempts; i++) {
		const res = await verifyChallenge(context, {
			challengeId: first,
			userId,
			proof: wrongProof,
		});
		expect(res.error?.status).toBe(401);
	}
	const exhausted = await verifyChallenge(context, {
		challengeId: first,
		userId,
		proof: { code: nextCode(secret) },
	});
	expect(exhausted.error?.status).toBe(401);

	const second = await startChallenge(userId);
	for (let i = 0; i < constants.twoFactor.maxChallengeAttempts; i++) {
		await verifyChallenge(context, {
			challengeId: second,
			userId,
			proof: wrongProof,
		});
	}

	const third = await startChallenge(userId);
	const limited = await verifyChallenge(context, {
		challengeId: third,
		userId,
		proof: { code: nextCode(secret) },
	});
	expect(limited.error?.status).toBe(429);
});

test("parallel wrong codes can't go over the account's hourly limit", async () => {
	const userId = await createUser("tf-parallel");
	await enable(userId);
	const challenges = await Promise.all(
		Array.from({ length: 4 }, () => startChallenge(userId)),
	);

	const results = await Promise.all(
		challenges.flatMap((challengeId) =>
			Array.from({ length: constants.twoFactor.maxChallengeAttempts }, () =>
				verifyChallenge(context, {
					challengeId,
					userId,
					proof: { recoveryCode: "wrong-code" },
				}),
			),
		),
	);
	const statuses = results.map((res) => res.error?.status);
	expect(statuses.filter((status) => status === 401)).toHaveLength(
		constants.twoFactor.hourlyAttemptLimit,
	);
	expect(statuses.filter((status) => status === 429)).toHaveLength(
		results.length - constants.twoFactor.hourlyAttemptLimit,
	);
});

test("a passed challenge can't be used again", async () => {
	const userId = await createUser("tf-consume");
	const { recoveryCodes } = await enable(userId);
	const challengeId = await startChallenge(userId);

	expect(
		await verifyChallenge(context, {
			challengeId,
			userId,
			proof: { recoveryCode: recoveryCodes[0] ?? "" },
		}),
	).toEqual({ error: undefined, data: undefined });
	expect(
		(
			await verifyChallenge(context, {
				challengeId,
				userId,
				proof: { recoveryCode: recoveryCodes[1] ?? "" },
			})
		).error?.status,
	).toBe(401);
});

test("two recovery codes sent to one login at once only use up the one that logs in, and neither counts as wrong", async () => {
	const userId = await createUser("tf-parallel-codes");
	const { recoveryCodes } = await enable(userId);
	const challengeId = await startChallenge(userId);
	const [first = "", second = ""] = recoveryCodes;
	await verifyChallenge(context, {
		challengeId,
		userId,
		proof: { recoveryCode: "wrong-code" },
	});

	const results = await Promise.all(
		[first, second].map((recoveryCode) =>
			verifyChallenge(context, {
				challengeId,
				userId,
				proof: { recoveryCode },
			}),
		),
	);
	const loserIndex = results.findIndex((res) => res.error !== undefined);
	expect(results.filter((res) => res.error === undefined)).toHaveLength(1);

	const unusedCode = loserIndex === 0 ? first : second;
	expect(
		await checkProof(context, { userId, proof: { recoveryCode: unusedCode } }),
	).toEqual({ error: undefined, data: undefined });

	//* only the wrong code counts against the account
	const user = await context.db.kysely
		.selectFrom("lucid_users")
		.select("two_factor_failed_attempts")
		.where("id", "=", userId)
		.executeTakeFirstOrThrow();
	expect(user.two_factor_failed_attempts).toBe(1);
});

test("replacing an app needs a code from the current one, which keeps working until the new one is confirmed", async () => {
	const userId = await createUser("tf-replace");
	const { secret } = await enable(userId);
	const readActiveSecret = () =>
		context.db.kysely
			.selectFrom("lucid_users")
			.select("two_factor_secret")
			.where("id", "=", userId)
			.executeTakeFirstOrThrow();
	const before = await readActiveSecret();

	expect((await startTwoFactorSetup(context, { userId })).error?.status).toBe(
		400,
	);
	const replaceRes = await startTwoFactorSetup(context, {
		userId,
		proof: { code: nextCode(secret) },
	});
	expect(replaceRes.error).toBeUndefined();
	expect(await readActiveSecret()).toEqual(before);

	const newSecret = await readPendingSecret(userId);
	const confirmRes = await activateSecret(context, {
		userId,
		code: totp(newSecret),
	});
	expect(confirmRes.error).toBeUndefined();
	expect(await readActiveSecret()).not.toEqual(before);
});

test("turning it off needs a code, and isn't allowed when it's required", async () => {
	const userId = await createUser("tf-disable");
	const { secret } = await enable(userId);
	const required = {
		...context,
		config: {
			...context.config,
			auth: {
				...context.config.auth,
				twoFactor: { enabled: true, required: true },
			},
		},
	};

	expect(
		(
			await disableTwoFactor(required, {
				userId,
				superAdmin: false,
				proof: { code: nextCode(secret) },
			})
		).error?.status,
	).toBe(400);
	expect(
		await disableTwoFactor(context, {
			userId,
			superAdmin: false,
			proof: { code: nextCode(secret) },
		}),
	).toEqual({ error: undefined, data: undefined });

	const user = await context.db.kysely
		.selectFrom("lucid_users")
		.select(["two_factor_enabled_at", "two_factor_secret"])
		.where("id", "=", userId)
		.executeTakeFirstOrThrow();
	expect(user).toEqual({
		two_factor_enabled_at: null,
		two_factor_secret: null,
	});

	const codes = await context.db.kysely
		.selectFrom("lucid_user_recovery_codes")
		.select("id")
		.where("user_id", "=", userId)
		.execute();
	expect(codes).toHaveLength(0);
});

test("it can be required for everyone, for super admins only, or by a role", async () => {
	const withRequired = (required: boolean | "super-admins") => ({
		...context,
		config: {
			...context.config,
			auth: {
				...context.config.auth,
				twoFactor: { enabled: true, required },
			},
		},
	});
	const standardId = await createUser("tf-required-standard");
	const superAdminId = await createUser("tf-required-super", true);

	expect(
		(
			await isRequired(withRequired(true), {
				userId: standardId,
				superAdmin: false,
			})
		).data,
	).toBe(true);
	expect(
		(
			await isRequired(withRequired("super-admins"), {
				userId: superAdminId,
				superAdmin: true,
			})
		).data,
	).toBe(true);
	expect(
		(
			await isRequired(withRequired("super-admins"), {
				userId: standardId,
				superAdmin: false,
			})
		).data,
	).toBe(false);

	const role = await context.db.kysely
		.insertInto("lucid_roles")
		.values({ name: "tf-required-role", require_two_factor: true })
		.returning("id")
		.executeTakeFirstOrThrow();
	await context.db.kysely
		.insertInto("lucid_user_roles")
		.values({ user_id: standardId, role_id: role.id })
		.execute();
	expect(
		(await isRequired(context, { userId: standardId, superAdmin: false })).data,
	).toBe(true);

	//* a role that requires it also stops it being turned off
	const { secret } = await enable(standardId);
	expect(
		(
			await disableTwoFactor(context, {
				userId: standardId,
				superAdmin: false,
				proof: { code: nextCode(secret) },
			})
		).error?.status,
	).toBe(400);
});

test("admins can reset other people, but not themselves, and only super admins can reset super admins", async () => {
	const adminId = await createUser("tf-admin");
	const superAdminId = await createUser("tf-super-admin", true);
	const targetId = await createUser("tf-target", true);
	await enable(targetId);
	const challengeId = await startChallenge(targetId);

	expect(
		(
			await resetTwoFactor(context, {
				auth: authFor(targetId, true),
				userId: targetId,
			})
		).error?.status,
	).toBe(400);
	expect(
		(
			await resetTwoFactor(context, {
				auth: authFor(adminId, false),
				userId: targetId,
			})
		).error?.status,
	).toBe(403);
	expect(
		await resetTwoFactor(context, {
			auth: authFor(superAdminId, true),
			userId: targetId,
		}),
	).toEqual({ error: undefined, data: undefined });

	const challenge = await context.db.kysely
		.selectFrom("lucid_user_tokens")
		.select("revoked_at")
		.where("id", "=", challengeId)
		.executeTakeFirstOrThrow();
	expect(challenge.revoked_at).not.toBeNull();
});
