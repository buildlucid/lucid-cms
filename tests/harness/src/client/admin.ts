import { CAPTCHA_TOKEN } from "../../../shared/fragments/auth.ts";
import type { Credentials, Session } from "./types.ts";
import waitForEmail, { listEmails } from "./wait-for-email.ts";

/** The super admin every setup's database is seeded with. */
export const ADMIN: Credentials = {
	email: "admin@harness.test",
	username: "admin",
	password: "Harness-admin-password-1!",
};

/** Throws with the response's details when a request the harness relies on fails. */
export const expectOk = (
	action: string,
	response: { ok: boolean; status: number; body: unknown },
) => {
	if (!response.ok) {
		throw new Error(
			`${action} failed with ${response.status}: ${JSON.stringify(response.body)}`,
		);
	}
};

/** Creates the first admin through the CMS's own setup flow, unless a user already exists. */
export const ensureAdmin = async (session: Session): Promise<void> => {
	const status = await session.request<{ data: { setupRequired: boolean } }>({
		path: "/api/v1/auth/setup-required",
	});
	expectOk("Checking whether setup is required", status);
	if (!status.body.data.setupRequired) {
		return;
	}

	const setup = await session.request({
		method: "POST",
		path: "/api/v1/auth/setup",
		body: {
			email: ADMIN.email,
			username: ADMIN.username,
			firstName: "Harness",
			lastName: "Admin",
			password: ADMIN.password,
			passwordConfirmation: ADMIN.password,
		},
	});
	expectOk("Creating the admin", setup);
};

/** The template magic links are sent with. */
const MAGIC_LINK_TEMPLATE = "magic-link";

const LOGIN_ATTEMPTS = 40;
const LOGIN_RETRY_MS = 250;

/**
 * Signs in and stores session cookies. Retries refused password attempts because concurrent test
 * logins can temporarily exhaust the account's attempt limit. `captcha` sends the token the
 * `captcha` variant accepts.
 */
export const login = async (
	session: Session,
	credentials: Pick<Credentials, "username" | "password">,
	options?: { captcha?: boolean },
): Promise<void> => {
	const send = () =>
		session.request({
			method: "POST",
			path: "/api/v1/auth/login",
			body: {
				usernameOrEmail: credentials.username,
				password: credentials.password,
			},
			headers: options?.captcha
				? { "lucid-captcha-token": CAPTCHA_TOKEN }
				: undefined,
		});

	let response = await send();
	for (
		let attempt = 1;
		response.status === 429 && attempt < LOGIN_ATTEMPTS;
		attempt++
	) {
		await new Promise((resolve) => setTimeout(resolve, LOGIN_RETRY_MS));
		response = await send();
	}
	expectOk(`Logging in as ${credentials.username}`, response);
	const step = (response.body as { data?: { twoFactor?: string | null } }).data
		?.twoFactor;
	if (step) {
		throw new Error(
			`Logging in as ${credentials.username} stopped at the two-factor ${step} step. Sign in with the helpers in shared/auth.ts instead.`,
		);
	}
};

/** Signs in with the link a magic link email carries, for configs without password login. */
export const loginWithMagicLink = async (
	session: Session,
	options: { email: string; outbox: string },
): Promise<void> => {
	const match = { to: options.email, template: MAGIC_LINK_TEMPLATE };
	const before = (await listEmails(options.outbox, match)).length;
	const sent = await session.request({
		method: "POST",
		path: "/api/v1/auth/magic-link",
		body: { email: options.email },
	});
	expectOk(`Sending a magic link to ${options.email}`, sent);

	const email = await waitForEmail(options.outbox, { ...match, after: before });
	const token = new URL(
		String(email.data.loginLink),
		"http://link",
	).searchParams.get("token");
	const loggedIn = await session.request({
		method: "POST",
		path: "/api/v1/auth/magic-link/login",
		body: { token },
	});
	expectOk(`Logging in as ${options.email} with a magic link`, loggedIn);
};
