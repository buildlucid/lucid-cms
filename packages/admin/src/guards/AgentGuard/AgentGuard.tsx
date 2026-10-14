import type { Component } from "solid-js";
import ConditionGuard from "@/guards/ConditionGuard/ConditionGuard";
import { getAgentAccess } from "@/utils/agent-access";

/** Requires agent access, accepting global routine oversight when `routines` is enabled. */
const agentGuard =
	(Page: Component, options?: { routines?: boolean }) => () => (
		<ConditionGuard
			condition={() =>
				getAgentAccess().all.length > 0 ||
				(options?.routines === true && getAgentAccess().manageAllRoutines)
			}
			redirect="/lucid"
		>
			<Page />
		</ConditionGuard>
	);

export default agentGuard;
