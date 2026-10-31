import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	sendEmail: vi.fn(),
}));

vi.mock("../../email/send-email.js", () => ({
	default: mocks.sendEmail,
}));

import constants from "../../../constants/constants.js";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { UserTokensRepository } from "../../../libs/repositories/index.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import confirmEmailChange from "../../account/confirm-email-change.js";
import createUserToken from "../../user-tokens/create-single.js";
import acceptInvitation from "../invitation/accept-invitation.js";
import login from "./login.js";
import send from "./send.js";
import validate from "./validate.js";

const testConfig = getTestConfig();
let context: ServiceContext;
afterAll(testConfig.destroy);

beforeAll(async () => {
	await testConfig.migrate();
	const config = await testConfig.getConfig();
	context = createServiceContext({
		config: {
			...config,
			auth: { ...config.auth, magicLink: { enabled: true } },
		},
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
});

beforeEach(() => {
	mocks.sendEmail.mockReset();
	mocks.sendEmail.mockResolvedValue({ error: undefined, data: undefined });
});

const createUser = async (
	username: string,
	values: { invitation_accepted?: boolean; is_locked?: boolean } = {},
) => {
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${username}@test.local`,
			username,
			secret: "test",
			invitation_accepted: values.invitation_accepted ?? true,
			is_locked: values.is_locked ?? false,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	return { id: user.id, email: `${username}@test.local` };
};

/** Sends a magic link and returns the code and token from the email. */
const sendAndRead = async (email: string) => {
	const res = await send(context, { email });
	expect(res.error).toBeUndefined();
	const data = mocks.sendEmail.mock.calls.at(-1)?.[1].data;
	return {
		code: data.code as string,
		token: new URL(data.loginLink, "http://lucid.local").searchParams.get(
			"token",
		) as string,
	};
};

/** Moves a user's magic links into the past, so the resend window has passed. */
const ageMagicLinks = (userId: number) =>
	context.db.kysely
		.updateTable("lucid_user_tokens")
		.set({ created_at: "2000-01-01 00:00:00" })
		.where("user_id", "=", userId)
		.where("token_type", "=", constants.userTokens.magicLink)
		.execute();

test("only active accounts are emailed, with the same response for everyone", async () => {
	const unaccepted = await createUser("ml-unaccepted", {
		invitation_accepted: false,
	});
	const locked = await createUser("ml-locked", { is_locked: true });

	for (const email of [
		"ml-nobody@test.local",
		unaccepted.email,
		locked.email,
	]) {
		expect(await send(context, { email })).toEqual({
			error: undefined,
			data: undefined,
		});
	}
	expect(mocks.sendEmail).not.toHaveBeenCalled();

	const active = await createUser("ml-active");
	const res = await send(context, {
		email: "ML-Active@test.local ",
		redirectPath: "/admin/media",
	});
	expect(res.error).toBeUndefined();
	expect(mocks.sendEmail).toHaveBeenCalledTimes(1);

	const email = mocks.sendEmail.mock.calls[0]?.[1];
	expect(email.to).toBe(active.email);
	expect(email.data.code).toMatch(/^\d{6}$/);
	expect(email.data.loginLink).toMatch(
		/^\/admin\/magic-link\/verify\?token=[a-f0-9]{64}&redirect=%2Fadmin%2Fmedia$/,
	);
});

test("repeat requests inside the resend window send nothing and keep the first email working", async () => {
	const user = await createUser("ml-cooldown");
	const first = await sendAndRead(user.email);

	await send(context, { email: user.email });
	expect(mocks.sendEmail).toHaveBeenCalledTimes(1);

	const res = await login(context, { email: user.email, code: first.code });
	expect(res).toEqual({ error: undefined, data: { id: user.id } });
});

test("a new email replaces the last one", async () => {
	const user = await createUser("ml-supersede");
	const first = await sendAndRead(user.email);
	await ageMagicLinks(user.id);
	const second = await sendAndRead(user.email);

	expect((await validate(context, { token: first.token })).error?.status).toBe(
		404,
	);
	expect(await validate(context, { token: second.token })).toEqual({
		error: undefined,
		data: { email: user.email },
	});
});

test("the link logs in once, and validating it doesn't use it up", async () => {
	const user = await createUser("ml-link");
	const { token, code } = await sendAndRead(user.email);

	await validate(context, { token });
	expect(await login(context, { token })).toEqual({
		error: undefined,
		data: { id: user.id },
	});

	expect((await login(context, { token })).error?.status).toBe(401);
	expect(
		(await login(context, { email: user.email, code })).error?.status,
	).toBe(401);
});

test("codes stop working after too many entries, but the link still works", async () => {
	const user = await createUser("ml-attempts");
	const { token, code } = await sendAndRead(user.email);
	const wrongCode = code === "000000" ? "111111" : "000000";

	for (let i = 0; i < constants.magicLink.maxCodeAttempts; i++) {
		const res = await login(context, { email: user.email, code: wrongCode });
		expect(res.error?.status).toBe(401);
	}
	expect(
		(await login(context, { email: user.email, code })).error?.status,
	).toBe(401);

	expect(await login(context, { token })).toEqual({
		error: undefined,
		data: { id: user.id },
	});
});

test("accounts locked after the email was sent can't log in", async () => {
	const user = await createUser("ml-locked-later");
	const { code } = await sendAndRead(user.email);
	await context.db.kysely
		.updateTable("lucid_users")
		.set({ is_locked: true })
		.where("id", "=", user.id)
		.execute();

	const res = await login(context, { email: user.email, code });
	expect(res.error?.status).toBe(401);
});

test("without password login, invitations are accepted without a password", async () => {
	const user = await createUser("ml-invited", { invitation_accepted: false });
	const invitation = await createUserToken(context, {
		userId: user.id,
		tokenType: constants.userTokens.invitation,
		expiryDate: new Date(Date.now() + 60_000).toISOString(),
	});
	if (invitation.error) throw new Error("invitation token not created");

	const passwordRequired = await acceptInvitation(context, {
		token: invitation.data.token,
	});
	expect(passwordRequired.error?.status).toBe(400);

	const passwordless = await acceptInvitation(
		{
			...context,
			config: {
				...context.config,
				auth: { ...context.config.auth, password: { enabled: false } },
			},
		},
		{ token: invitation.data.token },
	);
	expect(passwordless).toEqual({ error: undefined, data: { id: user.id } });
});

test("changing the account's email address revokes unused links", async () => {
	const user = await createUser("ml-email-change");
	const { token } = await sendAndRead(user.email);

	const expiryDate = new Date(Date.now() + 60_000).toISOString();
	const [confirm, revert] = await Promise.all([
		createUserToken(context, {
			userId: user.id,
			tokenType: constants.userTokens.emailChangeConfirm,
			expiryDate,
		}),
		createUserToken(context, {
			userId: user.id,
			tokenType: constants.userTokens.emailChangeRevert,
			expiryDate,
		}),
	]);
	if (confirm.error || revert.error) throw new Error("tokens not created");
	await context.db.kysely
		.insertInto("lucid_email_change_requests")
		.values({
			user_id: user.id,
			old_email: user.email,
			new_email: "ml-email-changed@test.local",
			confirm_token_id: confirm.data.tokenId,
			revert_token_id: revert.data.tokenId,
			status: constants.emailChangeRequestStatuses.pending,
			expires_at: expiryDate,
		})
		.execute();

	const confirmRes = await confirmEmailChange(context, {
		token: confirm.data.token,
	});
	expect(confirmRes.error).toBeUndefined();
	expect((await login(context, { token })).error?.status).toBe(401);
});

test("a link can't be used up once its address is no longer the account's email", async () => {
	const user = await createUser("ml-consume-binding");
	await sendAndRead(user.email);
	const UserTokens = new UserTokensRepository(context.db);
	const magicLink = await UserTokens.selectActiveMagicLink({
		where: { email: user.email },
	});
	if (!magicLink.data) throw new Error("magic link not found");

	//* the address changes between the lookup and using the link up
	await context.db.kysely
		.updateTable("lucid_users")
		.set({ email: "ml-consume-binding-new@test.local" })
		.where("id", "=", user.id)
		.execute();

	expect(await UserTokens.consumeMagicLink({ id: magicLink.data.id })).toEqual({
		error: undefined,
		data: false,
	});
});
