import classnames from "classnames";
import { FaSolidEllipsis } from "solid-icons/fa";
import { type Component, createMemo, For, Show } from "solid-js";
import AgentCompactionDivider from "@/components/AgentCompactionDivider/AgentCompactionDivider";
import AgentErrorNotice from "@/components/AgentErrorNotice/AgentErrorNotice";
import AgentMessage, {
	type AgentMessageProps,
} from "@/components/AgentMessage/AgentMessage";
import { layoutOf } from "@/components/AgentWidget/slots";
import type { AgentChat } from "@/hooks/useAgentChat/useAgentChat";
import T from "@/translations";
import { placeCompactions } from "@/utils/agent-chat";
import type { AgentReferenceItem } from "@/utils/agent-references";

/**
 * The chat's messages, then what the agent is doing now: a status line while it
 * works, a note when it was stopped, or the error that ended its run. Runs of
 * rows read as one block, even across messages.
 */
const AgentChatTranscript: Component<{
	chat: AgentChat;
	referenceDetails: Readonly<Record<string, AgentReferenceItem>>;
	selectedToolId?: string;
	onSelectTool: (id: string) => void;
	onRespond: AgentMessageProps["onRespond"];
	/** Whether a failed run can be retried from here. */
	canRetry: boolean;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const latestRun = createMemo(() => props.chat.data()?.latestRun);
	const compactions = createMemo(() =>
		placeCompactions(props.chat.messages, props.chat.compactions()),
	);
	/**
	 * What the end of the transcript shows while the agent works without waiting
	 * on the reader. Its last row shimmers, streaming text needs nothing, and
	 * otherwise a status line holds the place of the reply to come.
	 */
	const activity = createMemo(() => {
		const { chat } = props;
		if (!chat.working() || chat.pendingInteraction()) return undefined;
		if (latestRun()?.status === "interrupted" && !chat.streaming()) {
			return "retrying";
		}
		if (chat.context()?.status === "compacting") return "compacting";
		const last = chat.messages.at(-1);
		const part = last?.parts.findLast((item) => layoutOf(item) !== "hidden");
		if (last?.role === "user" || !part) return "thinking";
		if (layoutOf(part) === "row") return "row";
		return part.type === "text" ? undefined : "thinking";
	});
	const runError = createMemo(() => {
		const run = latestRun();
		return !props.chat.streaming() && run?.status === "failed"
			? run.errorMessage
			: undefined;
	});

	// ----------------------------------------
	// Functions
	const shownLayouts = (index: number) =>
		(props.chat.messages[index]?.parts ?? [])
			.map(layoutOf)
			.filter((layout) => layout !== "hidden");
	const endsInRow = (index: number) => shownLayouts(index).at(-1) === "row";
	/**
	 * Whether a message starts with a row straight after one that ended with
	 * one. Each model turn is its own message, so this lets rows read as one
	 * block.
	 */
	const continuesRows = (index: number) =>
		endsInRow(index - 1) && shownLayouts(index)[0] === "row";
	const statusFollowsRow = () =>
		endsInRow(
			props.chat.messages.findLastIndex(
				(message, index) =>
					message.role === "user" || shownLayouts(index).length > 0,
			),
		);
	//* a marker before the first loaded message may belong to an earlier page
	const compactedBefore = (id: string, index: number) =>
		compactions().before.has(id) &&
		!(index === 0 && props.chat.history.hasNextPage);
	const isLast = (index: number) => index === props.chat.messages.length - 1;

	// ----------------------------------------
	// Render
	return (
		<>
			<For each={props.chat.messages}>
				{(message, index) => (
					<>
						<Show when={compactedBefore(message.id, index())}>
							<AgentCompactionDivider />
						</Show>
						<div
							data-chat-message={message.id}
							data-chat-role={message.role}
							class={classnames("flex flex-col", {
								"-mt-5": continuesRows(index()),
								hidden:
									message.role !== "user" && shownLayouts(index()).length === 0,
							})}
						>
							<AgentMessage
								message={message}
								referenceDetails={props.referenceDetails}
								pendingInteractionId={props.chat.pendingInteraction()?.id}
								onRespond={props.onRespond}
								selectedToolId={props.selectedToolId}
								onSelectTool={props.onSelectTool}
								live={props.chat.streaming() && isLast(index())}
								working={activity() === "row" && isLast(index())}
							/>
						</div>
					</>
				)}
			</For>
			<Show when={compactions().trailing}>
				<AgentCompactionDivider />
			</Show>
			{/* laid out like a transcript row, as the agent's next step is often one; a shimmering row already shows the agent at work, so then it is only read out */}
			<Show when={activity()}>
				{(current) => (
					<div
						role="status"
						class={classnames(
							"agent-shimmer flex w-fit max-w-full items-center gap-2 py-1 text-xs text-muted",
							{
								"sr-only": current() === "row",
								"-mt-5": statusFollowsRow(),
							},
						)}
					>
						<span
							class="flex size-3.5 shrink-0 items-center justify-center"
							aria-hidden="true"
						>
							<FaSolidEllipsis size={10} />
						</span>
						{T()(
							current() === "retrying"
								? "agent.chat.retrying"
								: current() === "compacting"
									? "agent.context.compacting"
									: "agent.chat.thinking",
						)}
					</div>
				)}
			</Show>
			<Show
				when={!props.chat.streaming() && latestRun()?.status === "cancelled"}
			>
				<p class="text-sm text-muted">{T()("agent.chat.stopped")}</p>
			</Show>
			<Show when={props.chat.error() ?? runError()}>
				{(message) => (
					<AgentErrorNotice
						message={message()}
						onRetry={
							latestRun()?.status === "failed" &&
							!props.chat.working() &&
							props.canRetry
								? () => void props.chat.retry()
								: undefined
						}
					/>
				)}
			</Show>
		</>
	);
};

export default AgentChatTranscript;
