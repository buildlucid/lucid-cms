import type { Component, JSXElement } from "solid-js";
import PageLayout from "@/components/PageLayout/PageLayout";

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
		</PageLayout.Header>
	);
};

export default AgentHeader;
