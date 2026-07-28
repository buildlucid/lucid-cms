import formatter, {
	userPermissionsFormatter,
} from "../../libs/formatters/index.js";
import { getExternalCapability } from "../../libs/permission/capabilities.js";
import type { ExternalScope } from "../../libs/permission/external-scopes.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { LucidOAuthExternalAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";

type AuthorityGrant = {
	id: number;
	client_id: string;
	principal_type: "system" | "user";
	user_id: number | null;
	tenant_key: string | null;
	scopes: Array<{ scope: string }>;
};

/**
 * Resolves an OAuth grant into the effective external request authority.
 */
const resolveGrantAuthority: ServiceFn<
	[AuthorityGrant],
	LucidOAuthExternalAuth
> = async (context, grant) => {
	const grantedScopes = grant.scopes.map(
		(entry) => entry.scope as ExternalScope,
	);

	if (grant.principal_type === "system") {
		if (grant.user_id !== null) {
			return { error: { type: "authorisation", status: 401 }, data: undefined };
		}

		return {
			error: undefined,
			data: {
				credential: {
					type: "oauth",
					grantId: grant.id,
					clientId: grant.client_id,
				},
				principal: { type: "system" },
				tenantKey: grant.tenant_key,
				scopes: grantedScopes,
			},
		};
	}

	if (grant.user_id === null) {
		return { error: { type: "authorisation", status: 401 }, data: undefined };
	}

	const Users = new UsersRepository(context.db.client, context.config.db);
	const userRes = await Users.selectAccessTokenUser({
		where: [
			{ key: "id", operator: "=", value: grant.user_id },
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
		tenantKey: grant.tenant_key,
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
	const effectiveScopes = grantedScopes.filter((scope) => {
		const capability = getExternalCapability(context.config, scope, {
			tenantKey: grant.tenant_key,
		});
		if (!capability) return false;
		if (capability.userPermission === null || superAdmin) return true;
		return permissions?.includes(capability.userPermission) === true;
	});

	return {
		error: undefined,
		data: {
			credential: {
				type: "oauth",
				grantId: grant.id,
				clientId: grant.client_id,
			},
			principal: {
				type: "user",
				userId: grant.user_id,
			},
			tenantKey: grant.tenant_key,
			scopes: effectiveScopes,
		},
	};
};

export default resolveGrantAuthority;
