import T from "../../translations/index.js";
import type { ErrorResult } from "../../types/errors.js";
import type { Permission } from "../../types.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { permissionServices } from "../index.js";

const validatePermissions: ServiceFn<
	[
		{
			permissions: string[];
		},
	],
	{
		permission: Permission;
	}[]
> = async (context, data) => {
	if (data.permissions.length === 0) {
		return {
			error: undefined,
			data: [],
		};
	}

	const permissionsRes = await permissionServices.getAll(context);
	if (permissionsRes.error) return permissionsRes;

	const permErrors: Array<{
		key: string;
		error: ErrorResult;
	}> = [];
	const validPerms: Array<{
		permission: Permission;
	}> = [];

	for (let i = 0; i < data.permissions.length; i++) {
		const permission = data.permissions[i] as Permission;

		if (!permissionsRes.data.includes(permission)) {
			const findError = permErrors.find((e) => e.key === permission);
			if (!findError) {
				permErrors.push({
					key: permission,
					error: {
						key: permission,
						code: "invalid",
						message: T("the_permission_is_invalid_against_mesage", {
							permission: permission,
						}),
					},
				});
			}
			continue;
		}

		validPerms.push({
			permission,
		});
	}

	if (permErrors.length > 0) {
		return {
			error: {
				type: "basic",
				status: 500,
				errors: {
					permissions: permErrors.reduce<ErrorResult>((acc, e) => {
						acc[e.key] = e.error;
						return acc;
					}, {}),
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: validPerms,
	};
};

export default validatePermissions;
