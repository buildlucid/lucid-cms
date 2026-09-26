import type {
	AgentMessage as AgentMessageData,
	AgentMessagePart,
} from "@types";
import classnames from "classnames";
import { FaSolidCheck, FaSolidCopy } from "solid-icons/fa";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	Match,
	onCleanup,
	Show,
	Switch,
} from "solid-js";
import AgentWidget from "@/components/AgentWidget/AgentWidget";
import { copyValue } from "@/components/Copy/copyValue";
import T from "@/translations";
import { finishTool, isToolRow, messageText } from "@/utils/agent-chat";
import dateHelpers from "@/utils/date-helpers";
import AgentMarkdown from "./parts/AgentMarkdown";
import AgentQuestion from "./parts/AgentQuestion";
import AgentRunFinish from "./parts/AgentRunFinish";
import AgentToolCall from "./parts/AgentToolCall";

export interface AgentMessageProps {
	message: AgentMessageData;
	/** The id of the question the run is waiting on. */
	pendingQuestionId?: string;
	/** The tool call shown in the sidebar. */
	selectedToolId?: string;
	onSelectTool?: (id: string) => void;
}

const isToolAt = (parts: AgentMessagePart[], index: number) => {
	const part = parts[index];
	return part !== undefined && isToolRow(part);
};

/**
 * One message in a conversation: the user's text, or the agent's reply with its
 * tools, questions and widgets. Hovering a message with text shows when it was
 * sent and a copy button below it.
 */
const AgentMessage: Component<AgentMessageProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	//* runs of tool calls that are open, by the id of their first call
	const [expanded, setExpanded] = createSignal<ReadonlySet<string>>(new Set());
	const [copied, setCopied] = createSignal(false);
	let copiedTimer: ReturnType<typeof setTimeout> | undefined;

	// ----------------------------------------
	// Memos
	const user = createMemo(() => props.message.role === "user");
	const text = createMemo(() => messageText(props.message));

	// ----------------------------------------
	// Functions
	/** The index of the first call in the run of tool calls this index belongs to. */
	const leadOf = (index: number) => {
		let lead = index;
		while (isToolAt(props.message.parts, lead - 1)) lead--;
		return lead;
	};
	/** How many tool calls follow the one at this index in its run. */
	const followers = (index: number) => {
		let last = index;
		while (isToolAt(props.message.parts, last + 1)) last++;
		return last - index;
	};
	const leadId = (index: number) => {
		const lead = props.message.parts[leadOf(index)];
		return lead?.type === "tool" ? lead.id : undefined;
	};
	const copy = () => {
		copyValue(text());
		setCopied(true);
		clearTimeout(copiedTimer);
		copiedTimer = setTimeout(() => setCopied(false), 2000);
	};
	const toggle = (id: string | undefined) => {
		if (!id) return;
		setExpanded((open) => {
			const next = new Set(open);
			if (!next.delete(id)) next.add(id);
			return next;
		});
	};

	// ----------------------------------------
	// Effects
	onCleanup(() => clearTimeout(copiedTimer));

	// ----------------------------------------
	// Render
	return (
		<div class="flex flex-col">
			<Show
				when={!user()}
				fallback={
					<div class="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-input px-4 py-2.5">
						<For each={props.message.parts}>
							{(part) =>
								part.type === "text" ? (
									<AgentMarkdown text={part.text} tone="bubble" />
								) : null
							}
						</For>
					</div>
				}
			>
				{/* runs of compact rows sit close together; other parts keep the full gap */}
				<div class="flex w-full flex-col gap-6 [&>[data-compact-row]+[data-compact-row]]:-mt-5">
					<For each={props.message.parts}>
						{(part, index) => (
							<Switch>
								<Match when={part.type === "text" && part}>
									{(text) => <AgentMarkdown text={text().text} />}
								</Match>
								<Match
									when={
										part.type === "tool" && part.name === finishTool && part
									}
								>
									{(tool) => <AgentRunFinish part={tool()} />}
								</Match>
								<Match when={isToolRow(part) && part}>
									{(tool) => (
										<Show
											when={
												leadOf(index()) === index() ||
												expanded().has(leadId(index()) ?? "")
											}
										>
											<AgentToolCall
												part={tool()}
												selected={props.selectedToolId === tool().id}
												onSelect={props.onSelectTool}
												more={
													leadOf(index()) === index()
														? followers(index())
														: undefined
												}
												expanded={expanded().has(tool().id)}
												onToggle={() => toggle(tool().id)}
											/>
										</Show>
									)}
								</Match>
								<Match when={part.type === "question" && part}>
									{(question) => (
										<AgentQuestion
											part={question()}
											pending={props.pendingQuestionId === question().id}
										/>
									)}
								</Match>
								<Match when={part.type === "widget" && part}>
									{(widget) => (
										<AgentWidget
											key={widget().key}
											version={widget().version}
											data={widget().data}
										/>
									)}
								</Match>
							</Switch>
						)}
					</For>
				</div>
			</Show>
			<Show when={text()}>
				<div
					class={classnames(
						"mt-1.5 flex items-center gap-1 text-xs text-muted",
						user() ? "self-end" : "-ml-1 self-start",
					)}
				>
					<Show when={props.message.createdAt}>
						{(createdAt) => (
							<time
								datetime={createdAt()}
								title={dateHelpers.formatFullDate(createdAt())}
								class="px-1"
							>
								{dateHelpers.formatTimestamp(createdAt())}
							</time>
						)}
					</Show>
					<button
						type="button"
						class="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-card hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
						aria-label={T()("agent.message.copy")}
						title={T()("agent.message.copy")}
						onClick={copy}
					>
						<Show when={copied()} fallback={<FaSolidCopy size={11} />}>
							<FaSolidCheck size={11} class="text-success" />
						</Show>
					</button>
				</div>
			</Show>
		</div>
	);
};

export default AgentMessage;
