import {
	type ApiResponse,
	describe,
	expect,
	type Lucid,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import {
	enableTwoFactor,
	isSignedIn,
	linkToken,
	sendLogin,
} from "#shared/auth";

/** How many requests race for each one-time secret. Kept under the account's ten wrong codes an hour. */
const RACERS = 6;

/** Sends one request per new visitor at once, and returns the visitors with what each was answered. */
const race = async (
	lucid: Lucid,
	send: (visitor: Session) => Promise<ApiResponse<unknown>>,
	visitors: Session[] = Array.from({ length: RACERS }, () => lucid.session()),
) => {
	const responses = await Promise.all(visitors.map(send));
	return visitors.map((visitor, index) => ({
		visitor,
		ok: responses[index]?.ok ?? false,
	}));
};

/** Checks exactly one racer won, and only the winner is signed in when the secret signs people in. */
const expectOneWinner = async (
	results: Array<{ visitor: Session; ok: boolean }>,
	options?: { signsIn: boolean },
) => {
	expect(results.filter((result) => result.ok)).toHaveLength(1);
	if (options?.signsIn) {
		const signedIn = await Promise.all(
			results.map((result) => isSignedIn(result.visitor)),
		);
		expect(signedIn.filter(Boolean)).toHaveLength(1);
	}
};

const PASSWORD = "Harness-raced-password-3!";

describe("one-time secrets sent many times at once", () => {
	requires("harness:outbox", "auth:magicLink");

	test("a magic link signs in one browser", async ({ lucid }) => {
		const user = await lucid.user();
		await lucid.session().request({
			method: "POST",
			path: "/api/v1/auth/magic-link",
			body: { email: user.credentials.email },
		});
		const token = linkToken(
			await lucid.email({ to: user.credentials.email, template: "magic-link" }),
			"loginLink",
		);

		await expectOneWinner(
			await race(lucid, (visitor) =>
				visitor.request({
					method: "POST",
					path: "/api/v1/auth/magic-link/login",
					body: { token },
				}),
			),
			{ signsIn: true },
		);
	});

	test("an invitation is accepted once", async ({ lucid }) => {
		const { token } = await lucid.invite();

		await expectOneWinner(
			await race(lucid, (visitor) =>
				visitor.request({
					method: "POST",
					path: `/api/v1/auth/invitation/accept/${token}`,
					body: { password: PASSWORD, passwordConfirmation: PASSWORD },
				}),
			),
		);
	});

	test("a password reset link sets one password", async ({ lucid }) => {
		const user = await lucid.user();
		await lucid.session().request({
			method: "POST",
			path: "/api/v1/account/reset-password",
			body: { email: user.credentials.email },
		});
		const token = linkToken(
			await lucid.email({
				to: user.credentials.email,
				template: "reset-password",
			}),
			"resetLink",
		);

		await expectOneWinner(
			await race(lucid, (visitor) =>
				visitor.request({
					method: "PATCH",
					path: `/api/v1/account/reset-password/${token}`,
					body: { password: PASSWORD, passwordConfirmation: PASSWORD },
				}),
			),
		);
	});

	test("an authenticator code passes one login's two-factor step", async ({
		lucid,
	}) => {
		const user = await lucid.user();
		const { app } = await enableTwoFactor(user.session);
		const waiting = Array.from({ length: RACERS }, () => lucid.session());
		for (const visitor of waiting) {
			await sendLogin(visitor, user.credentials);
		}
		const code = await app.code();

		await expectOneWinner(
			await race(
				lucid,
				(visitor) =>
					visitor.request({
						method: "POST",
						path: "/api/v1/auth/two-factor/verify",
						body: { code },
					}),
				waiting,
			),
			{ signsIn: true },
		);
	});

	test("a recovery code passes one login's two-factor step", async ({
		lucid,
	}) => {
		const user = await lucid.user();
		const { recoveryCodes } = await enableTwoFactor(user.session);
		const waiting = Array.from({ length: RACERS }, () => lucid.session());
		for (const visitor of waiting) {
			await sendLogin(visitor, user.credentials);
		}

		await expectOneWinner(
			await race(
				lucid,
				(visitor) =>
					visitor.request({
						method: "POST",
						path: "/api/v1/auth/two-factor/verify",
						body: { recoveryCode: recoveryCodes[0] },
					}),
				waiting,
			),
			{ signsIn: true },
		);
	});

	test("a refresh token leaves at most one session, as losing the race counts as reuse", async ({
		lucid,
	}) => {
		const user = await lucid.user();
		const token = user.session
			.cookies()
			.find((cookie) => cookie.name === "_refresh")?.value;
		const copies = Array.from({ length: RACERS }, () => {
			const copy = lucid.session();
			copy.setCookie({ name: "_refresh", value: token ?? "" });
			return copy;
		});

		await race(
			lucid,
			(copy) => copy.request({ method: "POST", path: "/api/v1/auth/token" }),
			copies,
		);
		const refreshed = await Promise.all(
			[user.session, ...copies].map((session) =>
				session.request({ method: "POST", path: "/api/v1/auth/token" }),
			),
		);
		expect(refreshed.filter((response) => response.ok).length).toBeLessThan(2);
	});
});
