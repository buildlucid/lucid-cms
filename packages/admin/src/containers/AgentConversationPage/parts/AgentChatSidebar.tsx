import type { AgentConversation, AgentRoutine } from "@types";
import { type Component, Show } from "solid-js";
import AgentToolPanel from "@/components/AgentToolPanel/AgentToolPanel";
import type { AgentToolPart } from "@/utils/agent-tools";
import AgentChatDetailsCard from "./AgentChatDetailsCard";
import AgentRoutineCard from "./AgentRoutineCard";

/**
 * The cards floating beside the chat on wide screens: the routine card, the
 * chat's details, then any selected tool call. Transcript rows portal their
 * panels in through `ref`.
 */
const AgentChatSidebar: Component<{
	ref: (element: HTMLElement) => void;
	conversation: AgentConversation;
	routine?: AgentRoutine;
	detailsOpen: boolean;
	selectedTool?: { messageId: string; part: AgentToolPart };
	retriedToolIds: ReadonlySet<string>;
	onRoutineRun: (runId: string) => void;
	onRoutineRuns: () => void;
	onRoutineOpen: () => void;
	onRoutineClose: () => void;
	onDetailsClose: () => void;
	onToolClose: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			ref={props.ref}
			class="absolute top-0 inset-e-0 z-20 hidden max-h-full w-96 flex-col gap-4 overflow-x-hidden overflow-y-auto p-4 scrollbar lg:flex"
		>
			<Show when={props.routine}>
				{(routine) => (
					<AgentRoutineCard
						routine={routine()}
						conversation={props.conversation}
						onSelectRun={props.onRoutineRun}
						onRuns={props.onRoutineRuns}
						onOpen={props.onRoutineOpen}
						onClose={props.onRoutineClose}
					/>
				)}
			</Show>
			<Show when={props.detailsOpen}>
				<AgentChatDetailsCard
					conversation={props.conversation}
					onClose={props.onDetailsClose}
				/>
			</Show>
			<Show when={props.selectedTool}>
				{(tool) => (
					<AgentToolPanel
						conversationId={props.conversation.id}
						messageId={tool().messageId}
						part={tool().part}
						retried={props.retriedToolIds.has(tool().part.id)}
						onClose={props.onToolClose}
						class="flex shrink-0"
					/>
				)}
			</Show>
		</div>
	);
};

export default AgentChatSidebar;
