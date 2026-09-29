import {
	FaSolidFile,
	FaSolidFileAudio,
	FaSolidFileLines,
	FaSolidFileVideo,
	FaSolidImage,
} from "solid-icons/fa";
import { type Component, createMemo, Match, Switch } from "solid-js";
import Image from "@/components/Image/Image";
import {
	type AgentReferenceItem,
	agentReferenceKind,
} from "@/utils/agent-references";

/** A reference's image preview, or an icon for its kind when there is none. Fills its container. */
const AgentReferenceThumb: Component<{
	reference: AgentReferenceItem;
	iconSize?: number;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const kind = createMemo(() => agentReferenceKind(props.reference));
	const size = () => props.iconSize ?? 16;

	// ----------------------------------------
	// Render
	return (
		<Switch
			fallback={
				<span class="flex h-full w-full items-center justify-center bg-input text-subtitle fill-subtitle">
					<Switch fallback={<FaSolidFile size={size()} />}>
						<Match when={kind() === "image"}>
							<FaSolidImage size={size()} />
						</Match>
						<Match when={kind() === "audio"}>
							<FaSolidFileAudio size={size()} />
						</Match>
						<Match when={kind() === "video"}>
							<FaSolidFileVideo size={size()} />
						</Match>
						<Match when={kind() === "text"}>
							<FaSolidFileLines size={size()} />
						</Match>
					</Switch>
				</span>
			}
		>
			<Match when={props.reference.previewUrl}>
				{(url) => <Image src={url()} alt="" loading="lazy" />}
			</Match>
			<Match when={kind() === "pdf"}>
				<span class="flex h-full w-full items-center justify-center bg-input">
					<span class="rounded border border-danger-low-border bg-danger-low px-1.5 py-0.5 text-[11px] font-medium text-danger-low-foreground">
						PDF
					</span>
				</span>
			</Match>
			<Match when={kind() === "document"}>
				<span class="flex h-full w-full flex-col gap-1 bg-input p-2">
					<span class="h-1 w-3/4 rounded-full bg-border" />
					<span class="h-1 w-full rounded-full bg-border" />
					<span class="h-1 w-5/6 rounded-full bg-border" />
					<span class="h-1 w-1/2 rounded-full bg-border" />
				</span>
			</Match>
		</Switch>
	);
};

export default AgentReferenceThumb;
