import { copy } from "../../../libs/i18n/index.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import type { AgentToolAuthority } from "../../../libs/tools/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getAccessToken from "../../connection/token-manager.js";
import resolveUserAccess from "../../users/resolve-access.js";

/** Resolves current user authority; execution also requires a usable AI connection. */
const checkAgentAccess: ServiceFn<
	[{ userId: number; requireConnection?: boolean }],
	AgentToolAuthority
> = async (context, input) => {
	if (!context.config.ai.enabled || !context.config.ai.agent.enabled) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.disabled"),
			},
		};
	}

	const authority = await resolveUserAccess(context, { userId: input.userId });
	if (authority.error) return authority;
	if (
		!authority.data.superAdmin &&
		!authority.data.permissions.includes(Permissions.AiAgentUse)
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.access.denied"),
			},
		};
	}

	if (input.requireConnection) {
		const connection = await getAccessToken(context, {});
		if (connection.error) return connection;
	}

	return authority;
};

export default checkAgentAccess;
