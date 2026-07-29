import formatter, {
	userPermissionsFormatter,
} from "../../libs/formatters/index.js";
import { getExternalCapability } from "../../libs/permission/capabilities.js";
import type { ExternalScope } from "../../libs/permission/external-scopes.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Resolves the effective external scopes currently available to a user.
 */
const resolveUserAuthority: ServiceFn<
	[
		{
			userId: number;
			scopes: ExternalScope[];
		},
	],
	{
		principal: {
			type: "user";
			userId: number;
		};
		scopes: ExternalScope[];
	}
> = async (context, data) => {
	const Users = new UsersRepository(context.db.client, context.config.db);
	const userRes = await Users.selectAccessTokenUser({
		where: [
			{ key: "id", operator: "=", value: data.userId },
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
			{
				key: "is_locked",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				type: "authorisation",
				status: 401,
			},
		},
	});
	if (userRes.error) return userRes;

	const superAdmin = formatter.formatBoolean(userRes.data.super_admin ?? false);
	const { permissions } = userPermissionsFormatter.formatMultiple({
		roles: userRes.data.roles ?? [],
		defaultLocale: context.config.localization.defaultLocale,
	});
	const effectiveScopes = data.scopes.filter((scope) => {
		const capability = getExternalCapability(context.config, scope);
		if (!capability) return false;
		if (capability.userPermission === null || superAdmin) return true;
		return permissions?.includes(capability.userPermission) === true;
	});

	return {
		error: undefined,
		data: {
			principal: {
				type: "user",
				userId: data.userId,
			},
			scopes: effectiveScopes,
		},
	};
};

export default resolveUserAuthority;
