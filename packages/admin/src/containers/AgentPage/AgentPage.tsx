import { Navigate } from "@solidjs/router";
import { type Component, Show } from "solid-js";
import AgentHome from "@/components/AgentHome/AgentHome";
import PageLayout from "@/components/PageLayout/PageLayout";
import { getAgentAccess } from "@/utils/agent-access";

const AgentPage: Component = () => {
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
