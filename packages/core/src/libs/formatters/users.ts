import type { BooleanInt } from "../db/types.js";
import type { UserResponse } from "../../types/response.js";
import UserPermissionsFormatter from "./user-permissions.js";
import Formatter from "./index.js";
import z from "zod";

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
			createdAt: Formatter.formatDate(props.user.created_at),
			updatedAt: Formatter.formatDate(props.user.updated_at),
		};
	};

	static schema = z.object({
		id: z.number().meta({
			description: "The user's ID",
			example: 1,
		}),
		superAdmin: z.boolean().meta({
			description: "Whether the user is a superadmin.",
			example: true,
		}),
		email: z.email().meta({
			description: "The user's email address",
			example: "admin@lucidcms.io",
		}),
		username: z.string().meta({
			description: "The user's username",
			example: "admin",
		}),
		firstName: z.string().nullable().meta({
			description: "The user's first name",
			example: "John",
		}),
		lastName: z.string().nullable().meta({
			description: "The user's last name",
			example: "Smith",
		}),
		triggerPasswordReset: z.boolean().nullable().meta({
			description: "Should the UI force a password reset?",
			example: false,
		}),
		roles: z.array(UserPermissionsFormatter.schema.roles).meta({
			description: "The user's roles",
		}),
		permissions: z.array(UserPermissionsFormatter.schema.permissions),
		createdAt: z.string().nullable().meta({
			description: "The date the user was added",
			example: "2021-06-10T20:00:00.000Z",
		}),
		updatedAt: z.string().nullable().meta({
			description: "The date the user row was last updated",
			example: "2021-06-10T20:00:00.000Z",
		}),
	});

	static swagger = {
		type: "object",
		properties: {
			id: { type: "number", example: 1 },
			superAdmin: { type: "boolean", example: true },
			email: { type: "string", example: "admin@lucidcms.io" },
			username: { type: "string", example: "admin" },
			firstName: { type: "string", example: "Admin" },
			lastName: { type: "string", example: "User" },
			triggerPasswordReset: { type: "boolean", example: false, nullable: true },
			roles: UserPermissionsFormatter.swaggerRoles,
			permissions: UserPermissionsFormatter.swaggerPermissions,
			createdAt: { type: "string", example: "2021-06-10T20:00:00.000Z" },
			updatedAt: { type: "string", example: "2021-06-10T20:00:00.000Z" },
		},
	};
}
