import { copy } from "../../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import hasPermission from "../../../../libs/permission/has-permission.js";
import type { AgentToolExecution } from "../../../../libs/tools/types.js";
import type { LucidErrorData } from "../../../../types/errors.js";
import type { AgentScreen } from "../../../../types/response.js";
import type { ServiceContext } from "../../../../utils/services/types.js";

/** Resolves the originating document screen and checks collection read access. */
const resolveBuilderScreen = (
	context: ServiceContext,
	execution: AgentToolExecution,
) => {
	const screen = execution.screen;
	if (screen?.type !== "document") {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.screen.unavailable.unsupported"),
			} satisfies LucidErrorData,
			data: undefined,
		};
	}

	const collection = context.config.collections.find(
		(candidate) => candidate.key === screen.collectionKey,
	);
	if (
		!collection ||
		!hasPermission(
			execution.authority,
			getCollectionPermission(collection.key, "read"),
		)
	) {
		return {
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.tool.unavailable"),
			} satisfies LucidErrorData,
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			screen: screen satisfies Extract<AgentScreen, { type: "document" }>,
			collection,
		},
	};
};

export default resolveBuilderScreen;
