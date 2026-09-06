import { copy } from "../../libs/i18n/index.js";
import { getValidPermissions } from "../../libs/permission/registry.js";
import type { ErrorResult } from "../../types/errors.js";
import type { ServiceFn } from "../../utils/services/types.js";

const validatePermissions: ServiceFn<
	[
		{
			permissions: string[];
			/** Previously assigned keys may be retained while unavailable. */
			existingPermissions?: string[];
		},
	],
	{
		permission: string;
	}[]
> = async (context, data) => {
	if (data.permissions.length === 0) {
		return {
			error: undefined,
			data: [],
		};
	}

	const validPermissions = getValidPermissions(context.config);

	const permErrors: Array<{
		key: string;
		error: ErrorResult;
	}> = [];
	const validPerms: Array<{
		permission: string;
	}> = [];

	for (let i = 0; i < data.permissions.length; i++) {
		const permission = data.permissions[i];
		if (permission === undefined) continue;

		if (
			!validPermissions.includes(permission) &&
			!data.existingPermissions?.includes(permission)
		) {
			const findError = permErrors.find((e) => e.key === permission);
			if (!findError) {
				permErrors.push({
					key: permission,
					error: {
						key: permission,
						code: "invalid",
						message: copy("server:core.permissions.invalid", {
							data: {
								permission: permission,
							},
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
				status: 400,
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
