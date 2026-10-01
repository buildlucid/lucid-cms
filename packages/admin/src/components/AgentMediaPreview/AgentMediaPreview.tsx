import type { AgentWidgetPart } from "@types";
import { type Component, Match, Switch } from "solid-js";
import AgentWidgetUnavailable from "@/components/AgentWidget/AgentWidgetUnavailable";
import AgentMediaPreviewV1 from "./AgentMediaPreviewV1";

/** Picks the gallery view for the saved widget version. Unknown versions show their saved data. */
const AgentMediaPreview: Component<{
	conversationId: string;
	widget: AgentWidgetPart;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Switch fallback={<AgentWidgetUnavailable widget={props.widget} />}>
			<Match when={props.widget.version === 1}>
				<AgentMediaPreviewV1
					conversationId={props.conversationId}
					widget={props.widget}
				/>
			</Match>
		</Switch>
	);
};

export default AgentMediaPreview;
