import type { RoleResponse } from "../../types/response.js";
import type { Permission } from "../permission/types.js";
import formatter from "./index.js";

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

const formatMultiple = (props: { roles: RolePropsT[] }) => {
	return props.roles.map((r) =>
		formatSingle({
			role: r,
		}),
	);
};

const formatSingle = (props: { role: RolePropsT }): RoleResponse => {
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
		createdAt: formatter.formatDate(props.role.created_at),
		updatedAt: formatter.formatDate(props.role.updated_at),
	};
};

export default {
	formatMultiple,
	formatSingle,
};
