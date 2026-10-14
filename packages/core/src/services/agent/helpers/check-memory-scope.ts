import { copy } from "../../../libs/i18n/index.js";
import type { AgentMemoryScope } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Checks that the scope is enabled and shared memory writes have management permission. */
const checkMemoryScope: ServiceFn<
	[{ scope: AgentMemoryScope; canManageShared: boolean }],
	undefined
> = async (context, input) => {
	if (!context.config.ai.memory[input.scope].enabled) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy(
					input.scope === "shared"
						? "server:agent.memory.shared.disabled"
						: "server:agent.memory.personal.disabled",
				),
			},
		};
	}
	if (input.scope === "shared" && !input.canManageShared) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.memory.shared.forbidden"),
			},
		};
	}

	return { error: undefined, data: undefined };
};

export default checkMemoryScope;
