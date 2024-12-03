import type { RoleResponse, Permission } from "../../types/response.js";
import Formatter from "./index.js";

interface RolePropsT {
	id: number;
	name: string;
	description: string | null;
	updated_at: Date | string | null;
	created_at: Date | string | null;
	permissions?: {
		id: number;
		permission: string;
		role_id: number;
	}[];
}

export default class RolesFormatter {
	formatMultiple = (props: {
		roles: RolePropsT[];
	}) => {
		return props.roles.map((r) =>
			this.formatSingle({
				role: r,
			}),
		);
	};
	formatSingle = (props: {
		role: RolePropsT;
	}): RoleResponse => {
		return {
			id: props.role.id,
			name: props.role.name,
			description: props.role.description,
			permissions: props.role.permissions?.map((p) => {
				return {
					id: p.id,
					permission: p.permission as Permission,
				};
			}),
			createdAt: Formatter.formatDate(props.role.created_at),
			updatedAt: Formatter.formatDate(props.role.updated_at),
		};
	};
	static swagger = {
		type: "object",
		properties: {
			id: { type: "number" },
			name: {
				type: "string",
				example: "Admin",
			},
			description: {
				type: "string",
				example: "Admin role description",
			},
			permissions: {
				type: "array",
				example: [
					{
						id: 1,
						permission: "create_role",
					},
					{
						id: 2,
						permission: "update_role",
					},
				],
				items: {
					type: "object",
					properties: {
						id: {
							type: "number",
						},
						permission: {
							type: "string",
						},
					},
				},
			},
			createdAt: {
				type: "string",
				example: "2021-06-10T20:00:00.000Z",
			},
			updatedAt: {
				type: "string",
				example: "2021-06-10T20:00:00.000Z",
			},
		},
	};
}
