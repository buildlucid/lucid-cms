import type { Media } from "@types";
import classnames from "classnames";
import { FaSolidCheck, FaSolidPlus } from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import { useAgentTranscript } from "@/components/AgentTranscriptRow/AgentTranscriptContext";
import T from "@/translations";
import { mediaLabel, previewButtonClass } from "../helpers";

const AgentPreviewAttach: Component<{
	media: Media;
	revealOnHover?: boolean;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const transcript = useAgentTranscript();

	// ----------------------------------------
	// Memos
	const attachments = createMemo(() => transcript?.mediaAttachments());
	const attached = createMemo(
		() => attachments()?.isAttached(props.media.id) === true,
	);

	// ----------------------------------------
	// Render
	return (
		<Show when={attachments()?.canAttach(props.media)}>
			<button
				type="button"
				class={classnames(
					previewButtonClass,
					attached()
						? "border-primary bg-primary text-primary-foreground"
						: "border-border bg-card text-title",
					{
						"opacity-0 group-hover:opacity-100 focus-visible:opacity-100":
							props.revealOnHover && !attached(),
					},
					props.class,
				)}
				aria-pressed={attached()}
				aria-label={T()(
					attached() ? "agent.preview.detach" : "agent.preview.attach",
					{ name: mediaLabel(props.media) },
				)}
				onClick={() => attachments()?.toggle(props.media)}
			>
				<Show when={attached()} fallback={<FaSolidPlus size={10} />}>
					<FaSolidCheck size={10} />
				</Show>
			</button>
		</Show>
	);
};

export default AgentPreviewAttach;
