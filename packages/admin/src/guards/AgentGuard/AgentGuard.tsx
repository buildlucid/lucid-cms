import type { Component } from "solid-js";
import ConditionGuard from "@/guards/ConditionGuard/ConditionGuard";
import { getAgentAccess } from "@/utils/agent-access";

/** Agent pages need at least one agent the user can use or manage. */
const agentGuard = (Page: Component) => () => (
	<ConditionGuard
		condition={() => getAgentAccess().all.length > 0}
		redirect="/lucid"
	>
		<Page />
	</ConditionGuard>
);

export default agentGuard;
