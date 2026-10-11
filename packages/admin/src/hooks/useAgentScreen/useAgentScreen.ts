import type { AgentScreen } from "@types";
import { type Accessor, onCleanup, onMount } from "solid-js";
import { useAgentSession } from "@/hooks/useAgentSession/useAgentSession";

/** Registers the page's screen for agent messages while mounted, accepting undefined until its details are available. */
export const useAgentScreen = (screen: Accessor<AgentScreen | undefined>) => {
	const session = useAgentSession();
	onMount(() => onCleanup(session.screen.register({ screen })));
};
