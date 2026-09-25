import { type Component, createMemo, type JSXElement, Show } from "solid-js";
import Alert from "@/components/Alert/Alert";
import PageLayout from "@/components/PageLayout/PageLayout";
import Tabs from "@/components/Tabs/Tabs";
import siteStore from "@/store/siteStore/siteStore";
import T from "@/translations";

/** The agent pages' header, tabs, and a notice when the agent cannot run. */
const AgentHeader: Component<{ actions?: JSXElement }> = (props) => {
	// ----------------------------------------
	// Memos
	const disconnected = createMemo(() => {
		const connection = siteStore.get.connection;
		return connection !== null && connection.status !== "connected";
	});

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Header
			title={T()("routes.agent.title")}
			description={T()("routes.agent.description")}
			actions={props.actions}
		>
			<Tabs.Nav
				class="px-4 pb-4 md:px-6"
				items={[
					{ label: T()("routes.agent.chats"), href: "/lucid/agent" },
					{
						label: T()("routes.agent.routines"),
						href: "/lucid/agent/routines",
					},
				]}
			/>
			<Show when={disconnected()}>
				<Alert variant="warning" appearance="bar">
					{T()("agent.connection.required")}
				</Alert>
			</Show>
		</PageLayout.Header>
	);
};

export default AgentHeader;
