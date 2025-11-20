import type { UserResponse } from "../../types/response.js";
import type { LucidAuth } from "../../types/hono.js";
import type { BooleanInt } from "../db-adapter/types.js";
import formatter from "./index.js";
import hasAccess from "../permission/has-access.js";
import userPermissionsFormatter from "./user-permissions.js";
import { Permissions } from "../permission/definitions.js";

export interface UserPropT {
	created_at: Date | string | null;
	email: string;
	first_name: string | null;
	super_admin: BooleanInt | null;
	id: number;
	last_name: string | null;
	updated_at: Date | string | null;
	username: string;
	triggered_password_reset?: BooleanInt;
	invitation_accepted: BooleanInt;
	is_locked: BooleanInt;
	is_deleted: BooleanInt | null;
	is_deleted_at: Date | string | null;
	password?: string | null;
	auth_providers?: {
		id: number;
		provider_key: string;
		provider_user_id: string;
		linked_at: Date | string | null;
	}[];
	roles?: {
		id: number;
		description: string | null;
		name: string;
		permissions?: {
			permission: string;
		}[];
	}[];
}

const formatMultiple = (props: {
	users: UserPropT[];
	authUser?: LucidAuth;
}) => {
	return props.users.map((u) =>
		formatSingle({
			user: u,
			authUser: props.authUser,
		}),
	);
};

const formatSingle = (props: {
	user: UserPropT;
	authUser?: LucidAuth;
}): UserResponse => {
	const { roles, permissions } = userPermissionsFormatter.formatMultiple({
		roles: props.user.roles || [],
	});

	const canViewDetails = hasAccess({
		user: props.authUser,
		requiredPermissions: [Permissions.ReadUser],
		resourceOwnerId: props.user.id,
	});

	const canViewSensitive = hasAccess({
		user: props.authUser,
		requiredPermissions: [Permissions.UpdateUser],
		resourceOwnerId: props.user.id,
	});

	const response: UserResponse = {
		id: props.user.id,
		email: props.user.email,
		username: props.user.username,
		firstName: props.user.first_name,
		lastName: props.user.last_name,
		isDeleted: formatter.formatBoolean(props.user.is_deleted ?? false),
	};

	if (canViewDetails) {
		response.deletedAt = formatter.formatDate(props.user.is_deleted_at);
		response.createdAt = formatter.formatDate(props.user.created_at);
		response.updatedAt = formatter.formatDate(props.user.updated_at);
	}

	if (canViewSensitive) {
		response.isLocked = formatter.formatBoolean(props.user.is_locked);
		response.superAdmin = formatter.formatBoolean(
			props.user.super_admin ?? false,
		);
		response.triggerPasswordReset = formatter.formatBoolean(
			props.user.triggered_password_reset,
		);
		response.invitationAccepted = formatter.formatBoolean(
			props.user.invitation_accepted,
		);
		response.roles = roles;
		response.permissions = permissions;
		response.hasPassword = Boolean(props.user.password);
		response.authProviders = (props.user.auth_providers || []).map((p) => {
			return {
				id: p.id,
				providerKey: p.provider_key,
				providerUserId: p.provider_user_id,
				linkedAt: formatter.formatDate(p.linked_at),
			};
		});
	}

	return response;
};

export default {
	formatMultiple,
	formatSingle,
};
