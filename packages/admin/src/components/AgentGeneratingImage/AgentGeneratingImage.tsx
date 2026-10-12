import { type Component, createMemo } from "solid-js";
import GeneratingImage from "@/components/GeneratingImage/GeneratingImage";
import api from "@/services/api";
import { type AgentToolPart, imageAspectRatio } from "@/utils/agent-tools";

/** Reserves preview space using the requested or reviewed aspect ratio. */
const AgentGeneratingImage: Component<{
	conversationId: string;
	messageId: string;
	part: AgentToolPart;
	/** Reviewed settings take precedence over the tool input. */
	settings?: Record<string, unknown>;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const details = api.agent.useGetToolDetails({
		conversationId: () => props.conversationId,
		messageId: () => props.messageId,
		tool: () => props.part,
	});

	// ----------------------------------------
	// Memos
	const ratio = createMemo(() =>
		imageAspectRatio(props.settings ?? details.data?.data.input),
	);

	// ----------------------------------------
	// Render
	return (
		<div class="w-full max-w-80">
			<GeneratingImage ratio={ratio()} />
		</div>
	);
};

export default AgentGeneratingImage;
