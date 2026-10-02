import type { Component } from "solid-js";
import AgentHome from "@/components/AgentHome/AgentHome";
import PageLayout from "@/components/PageLayout/PageLayout";

const AgentPage: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Body padding="md" class="blur-background">
				<AgentHome />
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default AgentPage;
