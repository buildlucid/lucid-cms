import { TbOutlinePhotoAi } from "solid-icons/tb";
import { type Component, createMemo } from "solid-js";
import api from "@/services/api";
import T from "@/translations";
import { type AgentToolPart, imageSizeRatio } from "@/utils/agent-tools";

/** Reserves preview space using the requested or reviewed image size. */
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
		imageSizeRatio(props.settings ?? details.data?.data.input),
	);

	// ----------------------------------------
	// Render
	return (
		<div class="w-full max-w-80">
			<div
				role="img"
				aria-label={T()("agent.image.generating")}
				title={T()("agent.image.generating")}
				class="rectangle-background relative w-full overflow-hidden rounded-lg border border-border transition-[aspect-ratio] duration-300 ease-emphasized motion-reduce:transition-none"
				style={{ "aspect-ratio": ratio() }}
			>
				<div
					aria-hidden="true"
					class="skeleton-shimmer absolute inset-0 z-10 opacity-70"
				/>
				<div class="absolute inset-0 z-20 flex items-center justify-center text-muted">
					<TbOutlinePhotoAi
						size={28}
						class="motion-safe:animate-pulse"
						aria-hidden="true"
					/>
				</div>
			</div>
		</div>
	);
};

export default AgentGeneratingImage;
