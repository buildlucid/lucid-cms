import { afterAll, beforeAll, expect, test } from "vitest";
import constants from "../../constants/constants.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import type { LucidAuth } from "../../types/hono.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import createUserToken from "../user-tokens/create-single.js";
import getUserToken from "../user-tokens/get-single.js";
import requestEmailChange from "./request-email-change.js";
import resetPassword from "./reset-password.js";
import revertEmailChange from "./revert-email-change.js";
import sendResetPassword from "./send-reset-password.js";

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

const createUser = async (email: string) => {
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email,
			username: email,
			secret: "test",
			invitation_accepted: true,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	return user.id;
};

const setEmail = (userId: number, email: string) =>
	context.db.kysely
		.updateTable("lucid_users")
		.set({ email })
		.where("id", "=", userId)
		.execute();

const readEmail = async (userId: number) => {
	const user = await context.db.kysely
		.selectFrom("lucid_users")
		.select("email")
		.where("id", "=", userId)
		.executeTakeFirstOrThrow();
	return user.email;
};

const authFor = (id: number, email: string): LucidAuth => ({
	id,
	username: email,
	email,
	superAdmin: false,
	permissions: [],
	exp: 0,
	iat: 0,
	nonce: "test",
	authTime: Math.floor(Date.now() / 1000),
});

const expiresAt = () =>
	new Date(
		Date.now() + constants.emailChangeTokenExpirationMinutes * 60_000,
	).toISOString();

test("a later email change can't take the undo link from the old address", async () => {
	const userId = await createUser("undo-old@test.local");

	//* someone changed the email to their own address, and the undo link went to the old one
	const [confirmRes, revertRes] = await Promise.all([
		createUserToken(context, {
			userId,
			tokenType: constants.userTokens.emailChangeConfirm,
			expiryDate: expiresAt(),
		}),
		createUserToken(context, {
			userId,
			tokenType: constants.userTokens.emailChangeRevert,
			expiryDate: expiresAt(),
		}),
	]);
	if (confirmRes.error || revertRes.error) throw new Error("No tokens");
	await context.db.kysely
		.insertInto("lucid_email_change_requests")
		.values({
			user_id: userId,
			old_email: "undo-old@test.local",
			new_email: "undo-taken@test.local",
			confirm_token_id: confirmRes.data.tokenId,
			revert_token_id: revertRes.data.tokenId,
			status: constants.emailChangeRequestStatuses.confirmed,
			confirmed_at: new Date().toISOString(),
			expires_at: expiresAt(),
		})
		.execute();
	await setEmail(userId, "undo-taken@test.local");

	//* then changed it again, and confirmed that too
	const changeRes = await requestEmailChange(context, {
		auth: authFor(userId, "undo-taken@test.local"),
		oldEmail: "undo-taken@test.local",
		newEmail: "undo-later@test.local",
	});
	expect(changeRes.error).toBeUndefined();
	const later = await context.db.kysely
		.updateTable("lucid_email_change_requests")
		.set({ status: constants.emailChangeRequestStatuses.confirmed })
		.where("user_id", "=", userId)
		.where("status", "=", constants.emailChangeRequestStatuses.pending)
		.returning(["id", "revert_token_id"])
		.executeTakeFirstOrThrow();
	await setEmail(userId, "undo-later@test.local");

	const undoRes = await revertEmailChange(context, {
		token: revertRes.data.token,
	});
	expect(undoRes.error).toBeUndefined();
	expect(await readEmail(userId)).toBe("undo-old@test.local");

	const laterRequest = await context.db.kysely
		.selectFrom("lucid_email_change_requests")
		.innerJoin(
			"lucid_user_tokens",
			"lucid_user_tokens.id",
			"lucid_email_change_requests.revert_token_id",
		)
		.select([
			"lucid_email_change_requests.status",
			"lucid_user_tokens.revoked_at",
		])
		.where("lucid_email_change_requests.id", "=", later.id)
		.executeTakeFirstOrThrow();
	expect(laterRequest.status).toBe(
		constants.emailChangeRequestStatuses.superseded,
	);
	expect(laterRequest.revoked_at).not.toBeNull();
});

test("reset links stop working once one is used, or when the email changes", async () => {
	const userId = await createUser("reset-links@test.local");
	const createLink = async () => {
		const linkRes = await createUserToken(context, {
			userId,
			tokenType: constants.userTokens.passwordReset,
			expiryDate: expiresAt(),
			email: "reset-links@test.local",
		});
		if (linkRes.error) throw new Error("No reset link");
		return linkRes.data.token;
	};
	const isActive = async (token: string) =>
		(
			await getUserToken(context, {
				token,
				tokenType: constants.userTokens.passwordReset,
			})
		).error === undefined;

	const used = await createLink();
	const other = await createLink();
	expect(
		(
			await resetPassword(context, {
				token: used,
				password: "a-long-new-password-42!",
			})
		).error,
	).toBeUndefined();
	expect(await isActive(other)).toBe(false);

	const beforeChange = await createLink();
	expect(await isActive(beforeChange)).toBe(true);
	await setEmail(userId, "reset-links-new@test.local");
	expect(await isActive(beforeChange)).toBe(false);

	await sendResetPassword(context, { email: "reset-links-new@test.local" });
	const sent = await context.db.kysely
		.selectFrom("lucid_user_tokens")
		.select("email")
		.where("user_id", "=", userId)
		.where("token_type", "=", constants.userTokens.passwordReset)
		.orderBy("id", "desc")
		.executeTakeFirstOrThrow();
	expect(sent.email).toBe("reset-links-new@test.local");
});
