import type {
	AgentInteractionAction,
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
	Show,
	Switch,
} from "solid-js";
import AgentMediaPreview from "@/components/AgentMediaPreview/AgentMediaPreview";
import AgentReferenceFiles from "@/components/AgentReferenceFiles/AgentReferenceFiles";
import AgentWidget from "@/components/AgentWidget/AgentWidget";
import AgentWidgetRow from "@/components/AgentWidget/AgentWidgetRow";
import { layoutOf } from "@/components/AgentWidget/slots";
import type { AgentWidgetSubmitResult } from "@/components/AgentWidget/types";
import { createCopy } from "@/components/Copy/copyValue";
import T from "@/translations";
import { messageText } from "@/utils/agent-chat";
import {
	type AgentReferenceItem,
	agentReferenceKey,
} from "@/utils/agent-references";
import {
	isToolRow,
	previewMediaWidget,
	progressTool,
} from "@/utils/agent-tools";
import dateHelpers from "@/utils/date-helpers";
import AgentMarkdown from "./parts/AgentMarkdown";
import AgentRoutineRequest from "./parts/AgentRoutineRequest";
import AgentToolCall from "./parts/AgentToolCall";

export interface AgentMessageProps {
	message: AgentMessageData;
	/** Current details for linked resources, keyed by `agentReferenceKey`, so attachments can show previews. */
	referenceDetails?: Readonly<Record<string, AgentReferenceItem>>;
	pendingInteractionId?: string;
	onRespond?: (
		interactionId: string,
		response: Record<string, unknown>,
		action?: AgentInteractionAction,
	) => Promise<AgentWidgetSubmitResult>;
	/** The tool call shown in the sidebar. */
	selectedToolId?: string;
	onSelectTool?: (id: string) => void;
	/** Whether the message is streaming in, so text and widgets that appear in it animate in, and a reply holds back its timestamp and copy button until it ends. */
	live?: boolean;
	/** Whether the agent is still working on the message's last row, which shimmers until it moves on. */
	working?: boolean;
}

const isToolAt = (parts: AgentMessagePart[], index: number) => {
	const part = parts[index];
	return part !== undefined && isToolRow(part);
};

/**
 * One message in a conversation: the user's text, or the agent's reply with its
 * tools and widgets. A message that ends in text ends in when it was sent and
 * a copy button, which a reply shows once it finishes streaming.
 */
const AgentMessage: Component<AgentMessageProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [expanded, setExpanded] = createSignal<ReadonlySet<string>>(new Set());
	const [copied, copy] = createCopy(() => messageText(props.message));

	// ----------------------------------------
	// Memos
	const routine = createMemo(() =>
		props.message.parts.find((part) => part.type === "routine"),
	);
	const result = createMemo(() =>
		props.message.parts.find((part) => part.type === "run-result"),
	);
	const user = createMemo(() => props.message.role === "user");
	const text = createMemo(() => messageText(props.message));
	const hasText = createMemo(() =>
		props.message.parts.some((part) => part.type === "text" && part.text),
	);
	//* saved details are what was sent; current details add previews when the resource still exists
	const attachments = createMemo(() =>
		props.message.parts.flatMap((part) =>
			part.type === "reference"
				? [
						{
							...part.reference,
							previewUrl:
								props.referenceDetails?.[agentReferenceKey(part.reference)]
									?.previewUrl,
						},
					]
				: [],
		),
	);
	//* a message that ends in a row, such as a tool call, carries on in the next turn, so it has no timestamp
	const endsInText = createMemo(() => {
		const last = props.message.parts.findLast(
			(part) => layoutOf(part) !== "hidden",
		);
		return (
			last?.type === "text" ||
			(last?.type === "tool" && last.name === progressTool)
		);
	});

	// ----------------------------------------
	// Functions
	const leadOf = (index: number) => {
		let lead = index;
		while (isToolAt(props.message.parts, lead - 1)) lead--;
		return lead;
	};
	const followers = (index: number) => {
		let last = index;
		while (isToolAt(props.message.parts, last + 1)) last++;
		return last - index;
	};
	const leadId = (index: number) => {
		const lead = props.message.parts[leadOf(index)];
		return lead?.type === "tool" ? lead.id : undefined;
	};
	const visible = (index: number) => {
		const part = props.message.parts[index];
		if (!part || layoutOf(part) === "hidden") return false;
		if (!isToolRow(part) || leadOf(index) === index) return true;
		return expanded().has(leadId(index) ?? "");
	};
	/** Whether the part at this index shimmers: the last row, or the call leading its run while the run is folded away. */
	const shimmers = (index: number) => {
		if (!props.working) return false;
		const parts = props.message.parts;
		const last = parts.findLastIndex((part) => layoutOf(part) !== "hidden");
		const part = parts[last];
		if (!part || layoutOf(part) !== "row") return false;
		return (visible(last) ? last : leadOf(last)) === index;
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
	// Render
	return (
		<div class="flex flex-col">
			<Switch>
				<Match when={routine()}>
					{(routine) => (
						<AgentRoutineRequest
							name={routine().name}
							instructions={routine().instructions}
							trigger={routine().trigger}
							createdAt={props.message.createdAt}
							result={result()}
						/>
					)}
				</Match>
				<Match when={user()}>
					<div class="flex flex-col items-end gap-1">
						<AgentReferenceFiles
							references={attachments()}
							align="end"
							class="-me-4 w-[calc(85%+1rem)]"
						/>
						<Show when={hasText()}>
							<div class="max-w-[85%] rounded-2xl rounded-ee-md bg-input px-4 py-2.5">
								<For each={props.message.parts}>
									{(part) =>
										part.type === "text" ? (
											<AgentMarkdown text={part.text} tone="bubble" />
										) : null
									}
								</For>
							</div>
						</Show>
					</div>
				</Match>
				<Match when={true}>
					<div class="flex w-full flex-col gap-6 [&>[data-layout=row]+[data-layout=row]]:-mt-5">
						<For each={props.message.parts}>
							{(part, index) => {
								//* read once, so only parts that mount mid-stream animate in
								const live = props.live;
								//* cleared once it has played, as hiding and showing an element replays its animation
								const [entering, setEntering] = createSignal(
									live === true && part.type === "widget",
								);
								return (
									<Show when={visible(index())}>
										<div
											data-layout={layoutOf(part)}
											class={classnames("flex flex-col", {
												"motion-safe:animate-rise-in": entering(),
											})}
											onAnimationEnd={(event) => {
												if (event.target === event.currentTarget) {
													setEntering(false);
												}
											}}
										>
											{/* the shimmer animates its own element, as swapping animations on one element replays the entrance each time the shimmer stops */}
											<div
												class={classnames("flex flex-col", {
													"agent-shimmer w-fit max-w-full": shimmers(index()),
												})}
											>
												<Switch>
													<Match when={part.type === "text" && part}>
														{(text) => (
															<AgentMarkdown
																text={text().text}
																animate={live}
															/>
														)}
													</Match>
													<Match
														when={
															part.type === "tool" &&
															part.name === progressTool &&
															part
														}
													>
														{(tool) => (
															<AgentMarkdown
																text={messageText({ parts: [tool()] })}
																animate={live}
															/>
														)}
													</Match>
													<Match when={isToolRow(part) && part}>
														{(tool) => (
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
														)}
													</Match>
													<Match
														when={
															part.type === "widget" &&
															part.key === previewMediaWidget &&
															part
														}
													>
														{(widget) => (
															<AgentMediaPreview
																conversationId={props.message.conversationId}
																widget={widget()}
															/>
														)}
													</Match>
													<Match when={part.type === "widget" && part}>
														{(widget) => (
															<Show
																when={layoutOf(widget()) === "block"}
																fallback={<AgentWidgetRow widget={widget()} />}
															>
																<AgentWidget
																	widget={widget()}
																	view="inline"
																	onRespond={
																		widget().interaction?.id ===
																		props.pendingInteractionId
																			? props.onRespond
																			: undefined
																	}
																/>
															</Show>
														)}
													</Match>
												</Switch>
											</div>
										</div>
									</Show>
								);
							}}
						</For>
					</div>
				</Match>
			</Switch>
			<Show
				when={text() && !routine() && (user() || (endsInText() && !props.live))}
			>
				<div
					class={classnames(
						"mt-1.5 flex items-center gap-1 text-xs text-muted",
						user() ? "self-end" : "-ms-1 self-start",
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
						onClick={() => void copy()}
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
