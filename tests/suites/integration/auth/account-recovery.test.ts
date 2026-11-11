import { randomUUID } from "node:crypto";
import {
	describe,
	expect,
	type Lucid,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import {
	addPasskey,
	enableTwoFactor,
	isSignedIn,
	linkToken,
	sendLogin,
	signInWithPasskey,
	signInWithProvider,
} from "#shared/auth";
import { PROVIDERS } from "#shared/fragments/auth";

const NEW_PASSWORD = "Harness-new-password-2!";

const refresh = (session: Session) =>
	session.request({ method: "POST", path: "/api/v1/auth/token" });

const requestReset = (session: Session, email: string) =>
	session.request<{ data: { message: string } }>({
		method: "POST",
		path: "/api/v1/account/reset-password",
		body: { email },
	});

const resetPassword = (session: Session, token: string) =>
	session.request({
		method: "PATCH",
		path: `/api/v1/account/reset-password/${token}`,
		body: { password: NEW_PASSWORD, passwordConfirmation: NEW_PASSWORD },
	});

/** Asks for a reset email for the user and returns the token from its link. */
const resetToken = async (lucid: Lucid, email: string) => {
	expect((await requestReset(lucid.session(), email)).status).toBe(200);
	return linkToken(
		await lucid.email({ to: email, template: "reset-password" }),
		"resetLink",
	);
};

describe("password resets", () => {
	requires("harness:outbox", "auth:password");

	test("take the emailed link once, change the password and end every session", async ({
		lucid,
	}) => {
		const user = await lucid.user();
		const token = await resetToken(lucid, user.credentials.email);

		const checked = await lucid.session().request({
			path: `/api/v1/account/reset-password/${token}`,
		});
		expect(checked.status).toBe(204);
		expect((await resetPassword(lucid.session(), token)).status).toBe(204);
		expect((await resetPassword(lucid.session(), token)).ok).toBe(false);

		expect((await refresh(user.session)).status).toBe(401);
		const old = await sendLogin(lucid.session(), user.credentials);
		expect(old.status).toBe(401);
		const changed = await sendLogin(lucid.session(), {
			username: user.credentials.username,
			password: NEW_PASSWORD,
		});
		expect(changed.status).toBe(200);
		await lucid.email({
			to: user.credentials.email,
			template: "password-reset-success",
		});
	});

	test("answer the same for an address with no account, and send it nothing", async ({
		lucid,
	}) => {
		const user = await lucid.user();
		const nobody = `nobody-${randomUUID()}@harness.test`;

		const known = await requestReset(lucid.session(), user.credentials.email);
		const unknown = await requestReset(lucid.session(), nobody);
		expect(unknown.status).toBe(known.status);
		expect(unknown.body).toEqual(known.body);

		await lucid.email({
			to: user.credentials.email,
			template: "reset-password",
		});
		expect(
			await lucid.emails({ to: nobody, template: "reset-password" }),
		).toEqual([]);
	});

	test("don't skip the two-factor step", async ({ lucid }) => {
		const user = await lucid.user();
		await enableTwoFactor(user.session);
		const token = await resetToken(lucid, user.credentials.email);
		expect((await resetPassword(lucid.session(), token)).status).toBe(204);

		const login = await sendLogin(lucid.session(), {
			username: user.credentials.username,
			password: NEW_PASSWORD,
		});
		expect(login.body.data.twoFactor).toBe("verify");
	});
});

describe("email changes", () => {
	requires("harness:outbox");

	const changeEmail = (session: Session, email: string) =>
		session.request({
			method: "PATCH",
			path: "/api/v1/account",
			body: { email },
		});

	test("only take effect once the new address confirms them", async ({
		lucid,
	}) => {
		const user = await lucid.user();
		const newEmail = `moved-${randomUUID()}@harness.test`;

		expect((await changeEmail(user.session, newEmail)).status).toBe(204);
		const before = await user.session.request<{ data: { email: string } }>({
			path: "/api/v1/account",
		});
		expect(before.body.data.email).toBe(user.credentials.email);

		const token = linkToken(
			await lucid.email({ to: newEmail, template: "email-change-confirm" }),
			"confirmLink",
		);
		const confirmed = await lucid.session().request({
			method: "PATCH",
			path: `/api/v1/account/email-change/confirm/${token}`,
		});
		expect(confirmed.status).toBe(204);

		const after = await user.session.request<{ data: { email: string } }>({
			path: "/api/v1/account",
		});
		expect(after.body.data.email).toBe(newEmail);
	});

	test("can be undone from the old address, which ends every session and removes ways in added since", async ({
		lucid,
	}) => {
		const owner = await lucid.user();
		//* someone with the owner's session moves the email to their own address and adds ways back in
		const intruder = await signInAgain(lucid, owner.credentials);
		const theirs = `intruder-${randomUUID()}@harness.test`;
		expect((await changeEmail(intruder, theirs)).status).toBe(204);
		const confirmToken = linkToken(
			await lucid.email({ to: theirs, template: "email-change-confirm" }),
			"confirmLink",
		);
		await intruder.request({
			method: "PATCH",
			path: `/api/v1/account/email-change/confirm/${confirmToken}`,
		});
		const passkey = await addPasskey(intruder, lucid.url);
		const subject = randomUUID();
		const canUseProviders = lucid.capabilities.includes(
			"harness:identityProvider",
		);
		if (canUseProviders) {
			await signInWithProvider(intruder, {
				provider: PROVIDERS.oauth,
				actionType: "authenticated-link",
				identity: { subject },
			});
		}

		const revertToken = linkToken(
			await lucid.email({
				to: owner.credentials.email,
				template: "email-change-revert",
			}),
			"revertLink",
		);
		const reverted = await lucid.session().request({
			method: "PATCH",
			path: `/api/v1/account/email-change/revert/${revertToken}`,
		});
		expect(reverted.status).toBe(204);

		expect(await isSignedIn(intruder)).toBe(false);
		expect((await refresh(intruder)).status).toBe(401);
		expect((await refresh(owner.session)).status).toBe(401);
		const withPasskey = lucid.session();
		expect((await signInWithPasskey(withPasskey, passkey)).ok).toBe(false);
		if (canUseProviders) {
			const withProvider = lucid.session();
			await signInWithProvider(withProvider, {
				provider: PROVIDERS.oauth,
				identity: { subject },
			});
			expect(await isSignedIn(withProvider)).toBe(false);
		}

		const back = lucid.session();
		const login = await sendLogin(back, {
			username: owner.credentials.email,
			password: owner.credentials.password,
		});
		expect(login.status).toBe(200);
	});
});

/** Signs the same user in on another device, as someone holding their password would. */
const signInAgain = async (
	lucid: Lucid,
	credentials: { username: string; password: string },
) => {
	const device = lucid.session();
	expect((await sendLogin(device, credentials)).status).toBe(200);
	return device;
};
