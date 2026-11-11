import { randomUUID } from "node:crypto";
import { expectOk, login } from "./admin.ts";
import type { Credentials, Session } from "./types.ts";
import waitForEmail from "./wait-for-email.ts";

/** The template the CMS invites users with. */
const INVITE_TEMPLATE = "user-invite";

export type InviteOptions = {
	/** The roles the new user gets. Defaults to none. */
	roleIds?: number[];
	superAdmin?: boolean;
};

/**
 * Invites a new user as the admin, accepts the invitation from the email it sent, and signs
 * the user in, as a person would. Needs a setup with `harness:outbox`.
 */
const inviteUser = async (options: {
	admin: Session;
	/** A new visitor, who becomes the user. */
	visitor: Session;
	outbox: string;
	invite: InviteOptions;
}): Promise<{ session: Session; credentials: Credentials }> => {
	const name = `user${randomUUID().replaceAll("-", "").slice(0, 12)}`;
	const credentials: Credentials = {
		email: `${name}@harness.test`,
		username: name,
		password: "Harness-user-password-1!",
	};

	const invited = await options.admin.request({
		method: "POST",
		path: "/api/v1/users",
		body: {
			email: credentials.email,
			username: credentials.username,
			firstName: "Harness",
			lastName: "User",
			roleIds: options.invite.roleIds ?? [],
			superAdmin: options.invite.superAdmin ?? false,
		},
	});
	expectOk("Inviting a user", invited);

	const email = await waitForEmail(options.outbox, {
		to: credentials.email,
		template: INVITE_TEMPLATE,
	});
	const token = new URL(
		String(email.data.inviteLink),
		"http://link",
	).searchParams.get("token");
	if (!token) {
		throw new Error(
			`The invitation email has no token: ${String(email.data.inviteLink)}`,
		);
	}

	const accepted = await options.visitor.request({
		method: "POST",
		path: `/api/v1/auth/invitation/accept/${token}`,
		body: {
			password: credentials.password,
			passwordConfirmation: credentials.password,
		},
	});
	expectOk("Accepting the invitation", accepted);
	await login(options.visitor, credentials);

	return { session: options.visitor, credentials };
};

export default inviteUser;
