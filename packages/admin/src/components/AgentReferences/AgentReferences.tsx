import type { AgentWidgetPart } from "@types";
import { type Component, Match, Switch } from "solid-js";
import AgentWidgetUnavailable from "@/components/AgentWidget/AgentWidgetUnavailable";
import AgentReferencesV1 from "./AgentReferencesV1";

/** Selects the references card by saved widget version, showing saved data for unknown versions. */
const AgentReferences: Component<{
	conversationId: string;
	widget: AgentWidgetPart;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Switch fallback={<AgentWidgetUnavailable widget={props.widget} />}>
			<Match when={props.widget.version === 1}>
				<AgentReferencesV1
					conversationId={props.conversationId}
					widget={props.widget}
				/>
			</Match>
		</Switch>
	);
};

export default AgentReferences;
