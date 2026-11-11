import { randomUUID } from "node:crypto";
import { expectOk, login } from "./admin.ts";
import type { Credentials, Session } from "./types.ts";
import waitForEmail from "./wait-for-email.ts";

/** The template the CMS invites users with. */
const INVITE_TEMPLATE = "user-invite";

export type InviteOptions = {
	/** The roles the new user gets. Defaults to none. */
	roleIds?: number[];
	/** Permissions for a new role made for this user alone, given on top of `roleIds`. */
	permissions?: readonly string[];
	superAdmin?: boolean;
};

/** A signed-in user a test made, and the role made for them when `permissions` was given. */
export type InvitedUser = {
	id: number;
	session: Session;
	credentials: Credentials;
	/** The user's own role. Change its permissions to change what the user can do. */
	roleId: number | null;
};

/** Creates a role with exactly these permissions, and returns its ID. */
export const createRole = async (
	admin: Session,
	permissions: readonly string[],
): Promise<number> => {
	const created = await admin.request<{ data: { id: number } }>({
		method: "POST",
		path: "/api/v1/roles",
		body: { name: `Role ${randomUUID()}`, permissions },
	});
	expectOk("Creating a role", created);
	return created.body.data.id;
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
}): Promise<InvitedUser> => {
	const name = `user${randomUUID().replaceAll("-", "").slice(0, 12)}`;
	const credentials: Credentials = {
		email: `${name}@harness.test`,
		username: name,
		password: "Harness-user-password-1!",
	};
	const roleId = options.invite.permissions
		? await createRole(options.admin, options.invite.permissions)
		: null;

	const invited = await options.admin.request({
		method: "POST",
		path: "/api/v1/users",
		body: {
			email: credentials.email,
			username: credentials.username,
			firstName: "Harness",
			lastName: "User",
			roleIds: [
				...(options.invite.roleIds ?? []),
				...(roleId === null ? [] : [roleId]),
			],
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

	const account = await options.visitor.request<{ data: { id: number } }>({
		path: "/api/v1/account",
	});
	expectOk("Reading the new user's account", account);

	return {
		id: account.body.data.id,
		session: options.visitor,
		credentials,
		roleId,
	};
};

export default inviteUser;
