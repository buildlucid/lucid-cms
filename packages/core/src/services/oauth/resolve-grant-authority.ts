import type { ExternalScope } from "../../libs/permission/external-scopes.js";
import type { LucidOAuthExternalAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveUserAuthority from "../integrations/resolve-user-authority.js";

type AuthorityGrant = {
	id: number;
	client_id: string;
	principal_type: "system" | "user";
	user_id: number | null;
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
				scopes: grantedScopes,
			},
		};
	}

	if (grant.user_id === null) {
		return { error: { type: "authorisation", status: 401 }, data: undefined };
	}

	const authority = await resolveUserAuthority(context, {
		userId: grant.user_id,
		scopes: grantedScopes,
	});
	if (authority.error) return authority;

	return {
		error: undefined,
		data: {
			credential: {
				type: "oauth",
				grantId: grant.id,
				clientId: grant.client_id,
			},
			principal: authority.data.principal,
			scopes: authority.data.scopes,
		},
	};
};

export default resolveGrantAuthority;
