import type { ResolvedLucidConfig } from "../../../types/config.js";
import type { AgentMemoryScope } from "../../../types/response.js";

/** Lists enabled writable scopes, requiring management permission for shared memories. */
const getMemoryScopes = (
	config: Pick<ResolvedLucidConfig, "ai">,
	canManageShared: boolean,
): AgentMemoryScope[] =>
	(["personal", "shared"] as const).filter(
		(scope) =>
			config.ai.memory[scope].enabled &&
			(scope === "personal" || canManageShared),
	);

export default getMemoryScopes;
