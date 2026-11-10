import type { Credentials, Session } from "./types.ts";

/** The super admin every setup's database is seeded with. */
export const ADMIN: Credentials = {
	email: "admin@harness.test",
	username: "admin",
	password: "Harness-admin-password-1!",
};

/** Throws with the response's details when a request the harness relies on fails. */
const expectOk = (
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

/** Logs a session in with a password, leaving its cookies ready for signed-in requests. */
export const login = async (
	session: Session,
	credentials: Pick<Credentials, "username" | "password">,
): Promise<void> => {
	const response = await session.request({
		method: "POST",
		path: "/api/v1/auth/login",
		body: {
			usernameOrEmail: credentials.username,
			password: credentials.password,
		},
	});
	expectOk(`Logging in as ${credentials.username}`, response);
};
