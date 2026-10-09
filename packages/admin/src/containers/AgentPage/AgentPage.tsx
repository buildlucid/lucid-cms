import { Navigate } from "@solidjs/router";
import { type Component, Show } from "solid-js";
import AgentHome from "@/components/AgentHome/AgentHome";
import PageLayout from "@/components/PageLayout/PageLayout";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import T from "@/translations";
import { getAgentAccess } from "@/utils/agent-access";

const AgentPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	usePageTitle(() => T()("routes.agent.title"));

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Body padding="md" class="blur-background">
				<Show
					when={getAgentAccess().chat.length > 0}
					fallback={<Navigate href="/lucid/agent/routines" />}
				>
					<AgentHome />
				</Show>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default AgentPage;
