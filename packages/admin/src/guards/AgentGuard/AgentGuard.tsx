import type { Component } from "solid-js";
import ConditionGuard from "@/guards/ConditionGuard/ConditionGuard";
import { getAgentAccess } from "@/utils/agent-access";

const agentGuard = (Page: Component) => () => (
	<ConditionGuard
		condition={() => getAgentAccess().all.length > 0}
		redirect="/lucid"
	>
		<Page />
	</ConditionGuard>
);

export default agentGuard;
