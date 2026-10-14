import type { AgentBuilderChangesData } from "@lucidcms/types";
import type {
	AgentInteractionAction,
	AgentMessage as AgentMessageData,
} from "@types";
import classnames from "classnames";
import {
	TbOutlineCheck,
	TbOutlineCopy,
	TbOutlineGitBranch,
} from "solid-icons/tb";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import AgentBuilderChanges from "@/components/AgentBuilderChanges/AgentBuilderChanges";
import AgentGeneratingImage from "@/components/AgentGeneratingImage/AgentGeneratingImage";
import AgentMarkdown from "@/components/AgentMarkdown/AgentMarkdown";
import AgentMediaPreviewV1 from "@/components/AgentMediaPreview/AgentMediaPreviewV1";
import AgentReferenceFiles from "@/components/AgentReferenceFiles/AgentReferenceFiles";
import AgentReferencesV1 from "@/components/AgentReferences/AgentReferencesV1";
import AgentScreenBadge from "@/components/AgentScreenBadge/AgentScreenBadge";
import AgentWidget from "@/components/AgentWidget/AgentWidget";
import { layoutOf } from "@/components/AgentWidget/slots";
import type { AgentWidgetSubmitResult } from "@/components/AgentWidget/types";
import AgentWidgetRow from "@/components/AgentWidgetRow/AgentWidgetRow";
import AudioPill from "@/components/AudioPill/AudioPill";
import { createCopy } from "@/components/Copy/copyValue";
import T from "@/translations";
import { messageText } from "@/utils/agent-chat";
import {
	type AgentReferenceItem,
	agentReferenceKey,
} from "@/utils/agent-references";
import {
	generatingMediaType,
	isToolRow,
	isWidgetSupported,
	mediaSettingsWidgets,
	partGroupAt,
	previewMediaWidget,
	progressTool,
	referencesWidget,
} from "@/utils/agent-tools";
import dateHelpers from "@/utils/date-helpers";
import AgentConfirmationGroup, {
	isConfirmationRow,
} from "./parts/AgentConfirmationGroup";
import AgentRoutineRequest from "./parts/AgentRoutineRequest";
import AgentToolGroup from "./parts/AgentToolGroup";

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
	retriedToolIds?: ReadonlySet<string>;
	onSelectTool?: (id: string) => void;
	/** Whether the message is streaming in, so text and widgets that appear in it animate in, and a reply holds back its timestamp and copy button until it ends. */
	live?: boolean;
	/** Whether the agent is still working on the message's last row, which shimmers until it moves on. */
	working?: boolean;
	/** Builder changes for the reply ending with this message, displayed after its parts. */
	builderChanges?: AgentBuilderChangesData[];
	/** Offers branching from this reply when provided. */
	onBranch?: () => void;
}

/** Renders user messages and agent replies with tools, widgets and available copy or branch actions. */
const AgentMessage: Component<AgentMessageProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
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
	const screen = createMemo(() =>
		props.message.parts.find((part) => part.type === "screen"),
	);
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
	const settingsWidget = (toolCallId: string) =>
		props.message.parts.find(
			(part) =>
				part.type === "widget" &&
				mediaSettingsWidgets.has(part.key) &&
				part.interaction?.toolCallId === toolCallId,
		);
	/** Finds the running media tool whose placeholder follows this part, preferring its settings widget. */
	const generatingMediaAfter = (index: number) => {
		const part = props.message.parts[index];
		const callId =
			part?.type === "tool"
				? part.id
				: part?.type === "widget" && mediaSettingsWidgets.has(part.key)
					? part.interaction?.toolCallId
					: undefined;
		if (!callId) return undefined;
		if (part?.type === "tool" && settingsWidget(callId)) return undefined;

		const tool = props.message.parts.find(
			(candidate) => candidate.type === "tool" && candidate.id === callId,
		);
		if (tool?.type !== "tool") return undefined;
		const type = generatingMediaType(tool);
		return type ? { tool, type } : undefined;
	};
	const answeredSettings = (toolCallId: string) => {
		const widget = settingsWidget(toolCallId);
		return widget?.type === "widget" &&
			widget.interaction?.status === "answered"
			? widget.interaction.response
			: undefined;
	};
	const groupAt = (index: number) =>
		partGroupAt(props.message.parts, index, isToolRow) ??
		partGroupAt(props.message.parts, index, isConfirmationRow);
	const visible = (index: number) => {
		const part = props.message.parts[index];
		return (
			part !== undefined &&
			layoutOf(part) !== "hidden" &&
			(!(isToolRow(part) || isConfirmationRow(part)) ||
				groupAt(index) !== undefined)
		);
	};
	const shimmers = (index: number) => {
		if (!props.working) return false;
		const parts = props.message.parts;
		const last = parts.findLastIndex((part) => layoutOf(part) !== "hidden");
		const part = parts[last];
		if (!part || layoutOf(part) !== "row") return false;
		return (groupAt(index)?.lastIndex ?? index) === last;
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
							events={routine().events}
							referenceDetails={props.referenceDetails}
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
					<div class="flex w-full flex-col gap-6 [&>[data-layout=row]+[data-layout=row]]:-mt-5 [&>[data-references]+[data-references]]:-mt-3">
						<For each={props.message.parts}>
							{(part, index) => {
								//* read once, so only parts that mount mid-stream animate in
								const live = props.live;
								//* cleared once it has played, as hiding and showing an element replays its animation
								const [entering, setEntering] = createSignal(
									live === true && part.type === "widget",
								);
								return (
									<>
										<Show when={visible(index())}>
											<div
												data-layout={layoutOf(part)}
												data-references={
													part.type === "widget" &&
													part.key === referencesWidget
														? ""
														: undefined
												}
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
														"agent-shimmer w-fit max-w-full":
															!isToolRow(part) && shimmers(index()),
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
														<Match
															when={partGroupAt(
																props.message.parts,
																index(),
																isToolRow,
															)}
														>
															{(group) => (
																<AgentToolGroup
																	group={group()}
																	retriedIds={props.retriedToolIds}
																	selectedToolId={props.selectedToolId}
																	onSelect={props.onSelectTool}
																	working={shimmers(index())}
																/>
															)}
														</Match>
														<Match
															when={
																part.type === "widget" &&
																part.key === previewMediaWidget &&
																isWidgetSupported(part) &&
																part
															}
														>
															{(widget) => (
																<AgentMediaPreviewV1
																	conversationId={props.message.conversationId}
																	widget={widget()}
																/>
															)}
														</Match>
														<Match
															when={
																part.type === "widget" &&
																part.key === referencesWidget &&
																isWidgetSupported(part) &&
																part
															}
														>
															{(widget) => (
																<AgentReferencesV1
																	conversationId={props.message.conversationId}
																	widget={widget()}
																/>
															)}
														</Match>
														<Match
															when={partGroupAt(
																props.message.parts,
																index(),
																isConfirmationRow,
															)}
														>
															{(group) => (
																<AgentConfirmationGroup group={group()} />
															)}
														</Match>
														<Match when={part.type === "widget" && part}>
															{(widget) => (
																<Show
																	when={layoutOf(widget()) === "block"}
																	fallback={
																		<AgentWidgetRow widget={widget()} />
																	}
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
										<Show when={generatingMediaAfter(index())}>
											{(generating) => (
												<div
													data-layout="block"
													class="flex flex-col motion-safe:animate-rise-in"
												>
													<Show
														when={generating().type === "image"}
														fallback={<AudioPill class="w-full max-w-80" />}
													>
														<AgentGeneratingImage
															conversationId={props.message.conversationId}
															messageId={props.message.id}
															part={generating().tool}
															settings={answeredSettings(generating().tool.id)}
														/>
													</Show>
												</div>
											)}
										</Show>
									</>
								);
							}}
						</For>
						<For each={props.builderChanges}>
							{(changes) => (
								<div data-layout="block" class="flex flex-col">
									<AgentBuilderChanges
										data={changes}
										runId={props.message.runId ?? props.message.id}
									/>
								</div>
							)}
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
					<Show when={screen()}>
						{(part) => (
							<AgentScreenBadge screen={part().screen} variant="icon" />
						)}
					</Show>
					<button
						type="button"
						class="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-card hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
						aria-label={T()("agent.message.copy")}
						title={T()("agent.message.copy")}
						onClick={() => void copy()}
					>
						<Show when={copied()} fallback={<TbOutlineCopy size={11} />}>
							<TbOutlineCheck size={11} class="text-success" />
						</Show>
					</button>
					<Show when={!user() && props.onBranch}>
						{(onBranch) => (
							<button
								type="button"
								class="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-card hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
								aria-label={T()("agent.message.branch")}
								title={T()("agent.message.branch")}
								onClick={() => onBranch()()}
							>
								<TbOutlineGitBranch size={11} />
							</button>
						)}
					</Show>
				</div>
			</Show>
		</div>
	);
};

export default AgentMessage;
