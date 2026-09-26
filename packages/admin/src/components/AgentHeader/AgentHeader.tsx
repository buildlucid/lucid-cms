import { type Component, type JSXElement, Show } from "solid-js";
import Alert from "@/components/Alert/Alert";
import PageLayout from "@/components/PageLayout/PageLayout";
import T from "@/translations";
import { isAgentDisconnected } from "@/utils/agent-access";

/** The header for agent list pages, with a notice when the agent cannot run. */
const AgentHeader: Component<{
	title: string;
	description: string;
	actions?: JSXElement;
	/** Shown under the title, such as a query toolbar. */
	children?: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<PageLayout.Header
			title={props.title}
			description={props.description}
			actions={props.actions}
		>
			{props.children}
			<Show when={isAgentDisconnected()}>
				<Alert variant="warning" appearance="bar">
					{T()("agent.connection.required")}
				</Alert>
			</Show>
		</PageLayout.Header>
	);
};

export default AgentHeader;
