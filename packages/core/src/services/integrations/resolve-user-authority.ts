import { getExternalCapability } from "../../libs/permission/capabilities.js";
import type { ExternalScope } from "../../libs/permission/external-scopes.js";
import { filterExternalScopes } from "../../libs/permission/scopes.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveUserAccess from "../users/resolve-access.js";

/**
 * Resolves the effective external scopes currently available to a user.
 */
const resolveUserAuthority: ServiceFn<
	[
		{
			userId: number;
			scopes: readonly string[];
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
	const user = await resolveUserAccess(context, { userId: data.userId });
	if (user.error) return user;

	const { superAdmin, permissions } = user.data;

	const effectiveScopes = filterExternalScopes(
		context.config,
		data.scopes,
		"user",
	).filter((scope) => {
		const capability = getExternalCapability(context.config, scope, "user");
		if (!capability) return false;
		if (capability.userPermission === null || superAdmin) return true;
		return (
			permissions?.some(
				(permission) => permission === capability.userPermission,
			) === true
		);
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
