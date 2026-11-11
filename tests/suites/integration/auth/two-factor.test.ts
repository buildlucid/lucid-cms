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
	type AuthenticatorApp,
	addPasskey,
	createAuthenticatorApp,
	enableTwoFactor,
	isSignedIn,
	linkToken,
	SESSION_COOKIES,
	sendLogin,
	signInWithPasskey,
	signInWithProvider,
	TWO_FACTOR_COOKIE,
} from "#shared/auth";
import { PROVIDERS } from "#shared/fragments/auth";

/** A user with an authenticator app, signed in on the session that set it up. */
const userWithApp = async (lucid: Lucid) => {
	const user = await lucid.user();
	const { app, recoveryCodes } = await enableTwoFactor(user.session);
	return { ...user, app, recoveryCodes };
};

const hasSessionCookies = (session: Session) =>
	session
		.cookies()
		.some((cookie) => SESSION_COOKIES.some((name) => name === cookie.name));

const verify = (
	session: Session,
	proof: { code: string } | { recoveryCode: string },
) =>
	session.request({
		method: "POST",
		path: "/api/v1/auth/two-factor/verify",
		body: proof,
	});

/** Checks a login is waiting at its two-factor step, then passes it with the app. */
const expectStepThenPass = async (session: Session, app: AuthenticatorApp) => {
	expect(hasSessionCookies(session)).toBe(false);
	expect(await isSignedIn(session)).toBe(false);

	const challenge = await session.request<{
		data: { step: string; methods: { app: boolean } };
	}>({ path: "/api/v1/auth/two-factor" });
	expect(challenge.body.data).toMatchObject({
		step: "verify",
		methods: { app: true },
	});

	expect((await verify(session, { code: await app.code() })).status).toBe(204);
	expect(await isSignedIn(session)).toBe(true);
};

/** Sends a magic link to the user and waits for its email. */
const sendMagicLink = async (lucid: Lucid, session: Session, email: string) => {
	const sent = await session.request({
		method: "POST",
		path: "/api/v1/auth/magic-link",
		body: { email },
	});
	expect(sent.status).toBe(204);
	return lucid.email({ to: email, template: "magic-link" });
};

describe("the two-factor step", () => {
	requires("harness:outbox");

	test("holds back a password login's session until a code passes", async ({
		lucid,
	}) => {
		const user = await userWithApp(lucid);
		const visitor = lucid.session();

		const login = await sendLogin(visitor, user.credentials);
		expect(login.body.data.twoFactor).toBe("verify");
		expect(visitor.cookies().map((cookie) => cookie.name)).toContain(
			TWO_FACTOR_COOKIE,
		);

		const wrong = await verify(visitor, { code: user.app.wrongCode() });
		expect(wrong.status).toBe(401);
		await expectStepThenPass(visitor, user.app);
	});

	test("takes each recovery code once", async ({ lucid }) => {
		const user = await userWithApp(lucid);
		const [recoveryCode = ""] = user.recoveryCodes;

		const first = lucid.session();
		await sendLogin(first, user.credentials);
		expect((await verify(first, { recoveryCode })).status).toBe(204);

		const second = lucid.session();
		await sendLogin(second, user.credentials);
		expect((await verify(second, { recoveryCode })).status).toBe(401);
		expect(await isSignedIn(second)).toBe(false);
	});
});

describe("the two-factor step after a magic link", () => {
	requires("harness:outbox", "auth:magicLink");

	test("holds back a login by link", async ({ lucid }) => {
		const user = await userWithApp(lucid);
		const visitor = lucid.session();
		const email = await sendMagicLink(lucid, visitor, user.credentials.email);

		const login = await visitor.request<{ data: { twoFactor: string } }>({
			method: "POST",
			path: "/api/v1/auth/magic-link/login",
			body: { token: linkToken(email, "loginLink") },
		});
		expect(login.body.data.twoFactor).toBe("verify");
		await expectStepThenPass(visitor, user.app);
	});

	test("holds back a login by code", async ({ lucid }) => {
		const user = await userWithApp(lucid);
		const visitor = lucid.session();
		const email = await sendMagicLink(lucid, visitor, user.credentials.email);

		const login = await visitor.request<{ data: { twoFactor: string } }>({
			method: "POST",
			path: "/api/v1/auth/magic-link/login",
			body: { email: user.credentials.email, code: String(email.data.code) },
		});
		expect(login.body.data.twoFactor).toBe("verify");
		await expectStepThenPass(visitor, user.app);
	});
});

describe("the two-factor step after a provider", () => {
	requires("harness:outbox", "harness:identityProvider");

	test("holds back a provider's login, unless the provider bypasses it", async ({
		lucid,
	}) => {
		const user = await userWithApp(lucid);
		const subject = `subject-${user.id}`;
		for (const provider of Object.values(PROVIDERS)) {
			await signInWithProvider(user.session, {
				provider,
				actionType: "authenticated-link",
				identity: { subject },
			});
		}

		const viaOAuth = lucid.session();
		const sentTo = await signInWithProvider(viaOAuth, {
			provider: PROVIDERS.oauth,
			identity: { subject },
			redirectPath: "/admin/media",
		});
		expect(sentTo.pathname).toBe("/admin/two-factor");
		expect(sentTo.searchParams.get("redirect")).toBe("/admin/media");
		await expectStepThenPass(viaOAuth, user.app);

		//* the OpenID Connect provider sets `bypassTwoFactor`, as its own sign-in has to cover it
		const viaOidc = lucid.session();
		const bypassed = await signInWithProvider(viaOidc, {
			provider: PROVIDERS.oidc,
			identity: { subject },
		});
		expect(bypassed.pathname).toBe("/admin");
		expect(await isSignedIn(viaOidc)).toBe(true);
	});
});

describe("the two-factor step after a passkey", () => {
	requires("harness:outbox", "auth:passkeys");

	test("is skipped, as a passkey already verifies the user", async ({
		lucid,
	}) => {
		const user = await userWithApp(lucid);
		const passkey = await addPasskey(user.session, lucid.url);

		const visitor = lucid.session();
		expect((await signInWithPasskey(visitor, passkey)).status).toBe(204);
		expect(await isSignedIn(visitor)).toBe(true);
	});
});

describe("required two-factor authentication", () => {
	requires("harness:outbox");

	test("makes a user set up an app at their next login, then keeps it on", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const role = await admin.request<{ data: { id: number } }>({
			method: "POST",
			path: "/api/v1/roles",
			body: {
				name: `Two-factor ${randomUUID()}`,
				permissions: [],
				requireTwoFactor: true,
			},
		});
		expect(role.ok).toBe(true);
		const { credentials, token } = await lucid.invite({
			roleIds: [role.body.data.id],
		});
		const visitor = lucid.session();
		await visitor.request({
			method: "POST",
			path: `/api/v1/auth/invitation/accept/${token}`,
			body: {
				password: credentials.password,
				passwordConfirmation: credentials.password,
			},
		});

		const login = await sendLogin(visitor, credentials);
		expect(login.body.data.twoFactor).toBe("setup");
		expect(await isSignedIn(visitor)).toBe(false);

		const setup = await visitor.request<{ data: { secret: string } }>({
			method: "POST",
			path: "/api/v1/auth/two-factor/setup",
		});
		expect(setup.status).toBe(200);
		const app = createAuthenticatorApp(setup.body.data.secret);
		const confirmed = await visitor.request<{
			data: { recoveryCodes: string[] };
		}>({
			method: "POST",
			path: "/api/v1/auth/two-factor/confirm",
			body: { code: await app.code() },
		});
		expect(confirmed.status).toBe(200);
		expect(confirmed.body.data.recoveryCodes).toHaveLength(10);
		expect(await isSignedIn(visitor)).toBe(true);

		const disabled = await visitor.request({
			method: "POST",
			path: "/api/v1/account/two-factor/disable",
			body: { code: await app.code() },
		});
		expect(disabled.ok).toBe(false);
	});
});
