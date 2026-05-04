import type { Role } from "../../types/response.js";
import type { BooleanInt } from "../db/types.js";
import type { Permission } from "../permission/types.js";
import formatter from "./index.js";

interface RolePropsT {
	id: number;
	key: string | null;
	locked: BooleanInt;
	translations?: Array<{
		name: string | null;
		description: string | null;
		locale_code: string;
	}>;
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

const formatSingle = (props: { role: RolePropsT }): Role => {
	return {
		id: props.role.id,
		key: props.role.key,
		name:
			props.role.translations?.map((translation) => ({
				value: translation.name,
				localeCode: translation.locale_code,
			})) ?? [],
		description:
			props.role.translations?.map((translation) => ({
				value: translation.description,
				localeCode: translation.locale_code,
			})) ?? [],
		locked: formatter.formatBoolean(props.role.locked),
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
