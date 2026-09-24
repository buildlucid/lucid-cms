import type { OAuthPrincipalType } from "../../../libs/db/tables/index.js";
import {
	type AccessConfig,
	getExternalCapability,
} from "../../../libs/permission/capabilities.js";
import { filterExternalScopes } from "../../../libs/permission/scopes.js";
import type { Permission } from "../../../libs/permission/types.js";

type Actor = {
	superAdmin: boolean;
	permissions?: Permission[];
};

/** Resolves the scopes this identity can actually grant at consent time. */
export const getGrantableOAuthScopes = (
	config: AccessConfig,
	requested: readonly string[],
	principalType: OAuthPrincipalType,
	actor: Actor,
) => {
	const supported = filterExternalScopes(config, requested, principalType);
	if (principalType === "system") return supported;

	return supported.filter((scope) => {
		const capability = getExternalCapability(config, scope, "user");
		if (!capability) return false;
		if (capability.userPermission === null || actor.superAdmin) return true;
		return (
			actor.permissions?.some(
				(permission) => permission === capability.userPermission,
			) === true
		);
	});
};
