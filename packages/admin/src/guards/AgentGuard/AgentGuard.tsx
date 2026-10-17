import type { Component } from "solid-js";
import ConditionGuard from "@/guards/ConditionGuard/ConditionGuard";
import { getAgentAccess } from "@/utils/agent-access";

/**
 * Requires agent access, accepting global routine oversight when `routines` is enabled.
 * @remarks `chat` requires chat access to at least one agent.
 */
const agentGuard =
	(Page: Component, options?: { routines?: boolean; chat?: boolean }) => () => (
		<ConditionGuard
			condition={() =>
				options?.chat === true
					? getAgentAccess().chat.length > 0
					: getAgentAccess().all.length > 0 ||
						(options?.routines === true && getAgentAccess().manageAllRoutines)
			}
			redirect="/admin"
		>
			<Page />
		</ConditionGuard>
	);

export default agentGuard;
