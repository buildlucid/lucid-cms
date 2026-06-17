import type { Config } from "../../types/config.js";
import type { LucidAuth } from "../../types/hono.js";
import type { Tenant, User } from "../../types/response.js";
import type { BooleanInt } from "../db/types.js";
import { Permissions } from "../permission/definitions.js";
import hasAccess from "../permission/has-access.js";
import formatter from "./index.js";
import type { MediaPosterPropsT } from "./media.js";
import mediaFormatter from "./media.js";
import userPermissionsFormatter from "./user-permissions.js";

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
	profile_picture?: MediaPosterPropsT[];
	auth_providers?: {
		id: number;
		provider_key: string;
		provider_user_id: string;
		linked_at: Date | string | null;
	}[];
	roles?: {
		id: number;
		name?: string | null;
		translations?: {
			name: string | null;
			locale_code: string | null;
		}[];
		permissions?: {
			permission: string;
		}[];
	}[];
	tenants?: {
		tenant_key: string;
	}[];
}

const formatMultiple = (props: {
	users: UserPropT[];
	authUser?: LucidAuth;
	host: string;
	locales: string[];
	defaultLocale: string;
	tenants?: Config["tenants"];
}) => {
	return props.users.map((u) =>
		formatSingle({
			user: u,
			authUser: props.authUser,
			host: props.host,
			locales: props.locales,
			defaultLocale: props.defaultLocale,
			tenants: props.tenants,
		}),
	);
};

const formatSingle = (props: {
	user: UserPropT;
	authUser?: LucidAuth;
	host: string;
	locales: string[];
	defaultLocale: string;
	tenants?: Config["tenants"];
	/**
	 * Uses a pre-resolved tenant list when the response should show accessible tenants,
	 * not only memberships loaded on the user row.
	 */
	tenantOverride?: Tenant[];
	pendingEmailChange?: {
		email: string;
		requestedAt: Date | string | null;
		expiresAt: Date | string | null;
	} | null;
}): User => {
	const { roles, permissions } = userPermissionsFormatter.formatMultiple({
		roles: props.user.roles || [],
		defaultLocale: props.defaultLocale,
	});

	const canViewDetails = hasAccess({
		user: props.authUser,
		requiredPermissions: [Permissions.UsersRead],
		resourceOwnerId: props.user.id,
	});

	const canViewSensitive = hasAccess({
		user: props.authUser,
		requiredPermissions: [Permissions.UsersUpdate],
		resourceOwnerId: props.user.id,
	});

	const response: User = {
		id: props.user.id,
		email: props.user.email,
		username: props.user.username,
		firstName: props.user.first_name,
		lastName: props.user.last_name,
		isDeleted: formatter.formatBoolean(props.user.is_deleted ?? false),
		profilePicture: mediaFormatter.formatEmbed({
			poster: props.user.profile_picture?.[0],
			host: props.host,
		}),
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

		if (props.tenantOverride !== undefined) {
			response.tenants = props.tenantOverride;
		} else if (props.tenants !== undefined) {
			/**
			 * Filters out stored memberships for tenants that are no longer configured.
			 */
			response.tenants =
				props.user.tenants?.flatMap((membership) => {
					const tenant = props.tenants?.find(
						(t) => t.key === membership.tenant_key,
					);
					if (tenant === undefined) return [];

					return [
						{
							key: tenant.key,
							name: tenant.name,
							default: tenant.default ?? false,
						},
					];
				}) ?? [];
		}
	}

	if (props.pendingEmailChange !== undefined) {
		response.pendingEmailChange = props.pendingEmailChange
			? {
					email: props.pendingEmailChange.email,
					requestedAt: formatter.formatDate(
						props.pendingEmailChange.requestedAt,
					),
					expiresAt: formatter.formatDate(props.pendingEmailChange.expiresAt),
				}
			: null;
	}

	return response;
};

export default {
	formatMultiple,
	formatSingle,
};
