import UserPermissionsFormatter from "./user-permissions.js";
import Formatter from "./index.js";
import type { BooleanInt } from "../db/types.js";
import type { UserResponse } from "../../types/response.js";

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
	is_deleted: BooleanInt | null;
	is_deleted_at: Date | string | null;
	roles?: {
		id: number;
		description: string | null;
		name: string;
		permissions?: {
			permission: string;
		}[];
	}[];
}

export default class UsersFormatter {
	formatMultiple = (props: {
		users: UserPropT[];
	}) => {
		return props.users.map((u) =>
			this.formatSingle({
				user: u,
			}),
		);
	};
	formatSingle = (props: {
		user: UserPropT;
	}): UserResponse => {
		const { roles, permissions } =
			new UserPermissionsFormatter().formatMultiple({
				roles: props.user.roles || [],
			});

		return {
			id: props.user.id,
			superAdmin: Formatter.formatBoolean(props.user.super_admin ?? false),
			email: props.user.email,
			username: props.user.username,
			firstName: props.user.first_name,
			lastName: props.user.last_name,
			roles: roles,
			permissions: permissions,
			triggerPasswordReset: Formatter.formatBoolean(
				props.user.triggered_password_reset,
			),
			isDeleted: Formatter.formatBoolean(props.user.is_deleted ?? false),
			deletedAt: Formatter.formatDate(props.user.is_deleted_at),
			createdAt: Formatter.formatDate(props.user.created_at),
			updatedAt: Formatter.formatDate(props.user.updated_at),
		};
	};
}
