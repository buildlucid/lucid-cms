import { randomUUID } from "node:crypto";
import type { Variant } from "../setup/variants.ts";
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

/** A user the admin invited who has not accepted yet, with the token from their email. */
export type Invitation = {
	credentials: Credentials;
	/** The invitation token from the email's link. */
	token: string;
	/** The user's own role, when the invitation gave `permissions`. */
	roleId: number | null;
};

/** Invites a new user as the admin and reads the token from the email it sent. */
export const sendInvitation = async (options: {
	admin: Session;
	outbox: string;
	invite: InviteOptions;
}): Promise<Invitation> => {
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

	return { credentials, token, roleId };
};

/**
 * Invites a user through the outbox and signs them in. Requires `harness:outbox`; accepting the
 * invitation signs in directly when password login is disabled.
 */
const inviteUser = async (options: {
	admin: Session;
	/** A new visitor, who becomes the user. */
	visitor: Session;
	outbox: string;
	invite: InviteOptions;
	variant: Variant | undefined;
}): Promise<InvitedUser> => {
	const { credentials, token, roleId } = await sendInvitation(options);
	const passwordless = options.variant === "passwordless";

	const accepted = await options.visitor.request({
		method: "POST",
		path: `/api/v1/auth/invitation/accept/${token}`,
		body: passwordless
			? {}
			: {
					password: credentials.password,
					passwordConfirmation: credentials.password,
				},
	});
	expectOk("Accepting the invitation", accepted);
	if (!passwordless) {
		await login(options.visitor, credentials, {
			captcha: options.variant === "captcha",
		});
	}

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
