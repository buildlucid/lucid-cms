import { useLocation, useNavigate, useParams } from "@solidjs/router";
import type {
	AgentApprovalMode,
	AgentInteractionAction,
	AiModelSelection,
} from "@types";
import classnames from "classnames";
import { TbOutlineArrowDown } from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Match,
	on,
	onCleanup,
	onMount,
	Show,
	Switch,
} from "solid-js";
import type { AgentComposerHandle } from "@/components/AgentComposer/AgentComposer";
import {
	type AgentMediaAttachments,
	AgentTranscriptContext,
} from "@/components/AgentTranscriptRow/AgentTranscriptContext";
import Button from "@/components/Button/Button";
import DeleteAgentConversationModal from "@/components/DeleteAgentConversationModal/DeleteAgentConversationModal";
import ErrorState from "@/components/ErrorState/ErrorState";
import Link from "@/components/Link/Link";
import LoadingState from "@/components/LoadingState/LoadingState";
import RenameAgentConversationModal from "@/components/RenameAgentConversationModal/RenameAgentConversationModal";
import RunAgentRoutineModal from "@/components/RunAgentRoutineModal/RunAgentRoutineModal";
import Spinner from "@/components/Spinner/Spinner";
import UpsertAgentRoutineDrawer from "@/components/UpsertAgentRoutineDrawer/UpsertAgentRoutineDrawer";
import ViewAgentRoutineRunsDrawer from "@/components/ViewAgentRoutineRunsDrawer/ViewAgentRoutineRunsDrawer";
import useAgentChat from "@/hooks/useAgentChat/useAgentChat";
import useChatScroll from "@/hooks/useChatScroll/useChatScroll";
import api from "@/services/api";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getAgentUnavailableReason } from "@/utils/agent-access";
import {
	type AgentReferenceItem,
	agentReferenceKey,
	canAttachMedia,
} from "@/utils/agent-references";
import { isToolRow, retriedToolIds } from "@/utils/agent-tools";
import { getNewChatHref } from "@/utils/home-view";
import AgentChatActions from "./parts/AgentChatActions";
import AgentChatComposer from "./parts/AgentChatComposer";
import AgentChatHeader from "./parts/AgentChatHeader";
import AgentChatSidebar from "./parts/AgentChatSidebar";
import AgentChatTimeline from "./parts/AgentChatTimeline";
import AgentChatTranscript from "./parts/AgentChatTranscript";

/**
 * A single chat with the agent: a header, then messages that scroll on their
 * own with the chat box, or a question box while the agent waits on an answer,
 * fixed below them. A tool call opens in a floating panel beside the chat,
 * which closes with its close button, Escape, or by selecting the call again.
 * The chat's details card sits above it, toggled from the header and
 * remembered between chats.
 */
const AgentConversationPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const params = useParams<{ conversationId: string }>();
	//* a chat started from the agent home arrives unsaved, with the agent and first message
	const location = useLocation<{
		message?: string;
		references?: AgentReferenceItem[];
		agentKey?: string;
		approvalMode?: AgentApprovalMode;
		modelSelection?: AiModelSelection;
	}>();
	const navigate = useNavigate();
	const [creating, setCreating] = createSignal(
		location.state?.agentKey !== undefined,
	);
	const chat = useAgentChat(() =>
		creating() ? undefined : params.conversationId,
	);
	const definitions = api.agent.useGetDefinitions();
	const createConversation = api.agent.useCreateConversation();
	const scroll = useChatScroll({
		hasEarlier: () => chat.history.hasNextPage,
		loadEarlier: () => chat.history.fetchNextPage(),
	});
	const [renameOpen, setRenameOpen] = createSignal(false);
	const [deleteOpen, setDeleteOpen] = createSignal(false);
	const [selectedId, setSelectedId] = createSignal<string>();
	const [sidebar, setSidebar] = createSignal<HTMLElement>();
	const [routineOpen, setRoutineOpen] = createSignal(false);
	const [runRoutineOpen, setRunRoutineOpen] = createSignal(false);
	const [focusApprovals, setFocusApprovals] = createSignal(false);
	const [routineCardOpen, setRoutineCardOpen] = createSignal(true);
	const [runsOpen, setRunsOpen] = createSignal(false);
	let composer: AgentComposerHandle | undefined;
	const [attached, setAttached] = createSignal(false);
	const [attachedKeys, setAttachedKeys] = createSignal<ReadonlySet<string>>();

	// ----------------------------------------
	// Memos
	const conversation = createMemo(() => chat.data());
	const references = api.agent.useGetReferences({
		id: () => conversation()?.id,
	});
	const referenceDetails = createMemo(() =>
		Object.fromEntries(
			(references.data?.data ?? []).map((reference) => [
				agentReferenceKey(reference),
				reference,
			]),
		),
	);
	const agent = createMemo(() =>
		definitions.data?.data.agents.find(
			(agent) => agent.key === conversation()?.agentKey,
		),
	);
	const unavailable = createMemo(() => getAgentUnavailableReason());
	const mediaAttachments = createMemo((): AgentMediaAttachments | undefined => {
		const keys = attachedKeys();
		const features = agent()?.features;
		if (!keys || !features || unavailable()) return undefined;
		const canReadLibrary = userStore.get.hasPermission(["media:read"]).all;

		return {
			canAttach: (media) => canAttachMedia(media, { features, canReadLibrary }),
			isAttached: (mediaId) =>
				keys.has(agentReferenceKey({ type: "media", mediaId })),
			toggle: (media) =>
				composer?.toggleReference({ type: "media", mediaId: media.id }),
		};
	});
	const routineQuery = api.agent.useGetRoutine({
		id: () => conversation()?.routineId ?? undefined,
	});
	const routine = createMemo(() =>
		routineQuery.isSuccess ? routineQuery.data.data : undefined,
	);
	const routineCard = createMemo(() =>
		routineCardOpen() ? routine() : undefined,
	);
	const detailsOpen = createMemo(
		() => userPreferencesStore.getSectionOpen("agent.chat.details") ?? false,
	);
	const sidebarOpen = createMemo(
		() => routineCard() !== undefined || detailsOpen() || !!selectedId(),
	);
	const tools = createMemo(() =>
		chat.messages.flatMap((message) =>
			message.parts
				.filter(isToolRow)
				.map((part) => ({ messageId: message.id, part })),
		),
	);
	const selectedTool = createMemo(() =>
		tools().find((tool) => tool.part.id === selectedId()),
	);
	const retriedTools = createMemo(() => retriedToolIds(chat.messages));

	// ----------------------------------------
	// Functions
	const respond = async (
		interactionId: string,
		response: Record<string, unknown>,
		action: AgentInteractionAction = "submit",
	) => {
		const reason = unavailable();
		if (reason) return { error: T()(`agent.unavailable.${reason}.title`) };
		const pending = chat.pendingInteraction();
		if (!pending || pending.id !== interactionId) {
			return { error: T()("agent.interaction.unavailable") };
		}

		const result = await chat.respond(pending, response, action);
		if (
			result.error === undefined &&
			pending.widget.interaction?.placement === "inline"
		) {
			composer?.focus();
		}

		return result;
	};
	const setDetailsOpen = (open: boolean) =>
		userPreferencesStore.setSectionOpen("agent.chat.details", open);
	const selectTool = (id: string) =>
		setSelectedId((current) => (current === id ? undefined : id));

	// ----------------------------------------
	// Effects
	/**
	 * A chat from the agent home opens before it is saved, so sending never waits
	 * there. It is saved here, then its first message is sent. If it
	 * cannot be saved, the message goes back to the agent home.
	 */
	onMount(async () => {
		const { message, agentKey, approvalMode, modelSelection, references } =
			location.state ?? {};
		if (message === undefined) return;
		navigate(location.pathname, { replace: true, state: {} });
		if (agentKey) {
			try {
				await createConversation.action.mutateAsync({
					id: params.conversationId,
					agentKey,
					approvalMode,
					modelSelection,
				});
			} catch {
				navigate(getNewChatHref(), {
					replace: true,
					state: { message, approvalMode, modelSelection, references },
				});
				return;
			}
			setCreating(false);
		}
		//* a message the agent did not accept goes into the chat box to try again
		if (!(await chat.send(message, "send", references))) {
			composer?.insert(message, references);
		}
	});
	//* a run's request message shares the run's id, so `?runId=` scrolls to where the run starts, loading older pages until it is found
	createEffect(
		on(
			[
				() => location.search,
				() => params.conversationId,
				() => chat.history.isSuccess,
			],
			([search, , ready]) => {
				const runId = new URLSearchParams(search).get("runId");
				if (!runId || !ready) return;
				let cancelled = false;
				onCleanup(() => {
					cancelled = true;
				});
				void (async () => {
					while (
						!cancelled &&
						!chat.messages.some((message) => message.id === runId)
					) {
						if (!chat.history.hasNextPage) return;
						const page = await chat.history.fetchNextPage();
						if (page.isError) return;
					}
					requestAnimationFrame(() => {
						if (!cancelled) scroll.scrollToMessage(runId);
					});
				})();
			},
		),
	);
	createEffect(() => {
		if (!selectedId()) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !event.defaultPrevented) {
				setSelectedId(undefined);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		onCleanup(() => window.removeEventListener("keydown", onKeyDown));
	});
	createEffect(
		on(
			[() => params.conversationId, () => location.search],
			() => {
				setSelectedId(undefined);
				setRunsOpen(false);
				setRunRoutineOpen(false);
				if (!new URLSearchParams(location.search).has("runId")) {
					scroll.scrollToEnd();
				}
			},
			{ defer: true },
		),
	);

	// ----------------------------------------
	// Render
	return (
		<AgentTranscriptContext.Provider
			value={{
				selected: selectedId,
				select: setSelectedId,
				sidebar,
				mediaAttachments,
			}}
		>
			<div
				data-agent-chat
				class="flex h-[calc(100dvh-4.25rem)] flex-col overflow-hidden rounded-t-xl border-x border-t border-border bg-background md:h-[calc(100dvh-1rem)]"
			>
				<AgentChatHeader
					conversation={conversation()}
					actions={
						<AgentChatActions
							routineCard={
								routine()
									? {
											open: routineCardOpen(),
											onToggle: () => setRoutineCardOpen((open) => !open),
										}
									: undefined
							}
							runRoutine={
								routine()
									? {
											disabled:
												runRoutineOpen() ||
												chat.working() ||
												unavailable() !== undefined,
											onRun: () => setRunRoutineOpen(true),
										}
									: undefined
							}
							details={{
								open: detailsOpen(),
								onToggle: () => setDetailsOpen(!detailsOpen()),
							}}
							onRename={() => setRenameOpen(true)}
							onDelete={() => setDeleteOpen(true)}
						/>
					}
				/>
				<div class="relative flex min-h-0 grow">
					<section
						class={classnames(
							"flex min-w-0 grow flex-col transition-[margin] duration-300 ease-out",
							{ "lg:me-96": sidebarOpen() },
						)}
					>
						<Switch>
							<Match when={chat.conversation.isError}>
								<ErrorState
									title={T()("agent.chat.missing.title")}
									description={T()("agent.chat.missing.description")}
									actions={
										<Link variant="primary" size="sm" href={getNewChatHref()}>
											{T()("agent.chat.new")}
										</Link>
									}
								/>
							</Match>
							<Match when={chat.history.isLoading}>
								<LoadingState class="grow" />
							</Match>
							<Match when={true}>
								<div class="@container relative flex min-h-0 grow flex-col">
									<div
										ref={scroll.setViewport}
										class="min-h-0 grow overflow-y-auto scrollbar [overflow-anchor:none]"
									>
										<div ref={scroll.setSentinel} aria-hidden="true" />
										<div
											ref={scroll.setContent}
											class={classnames(
												"mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 md:px-6",
												attached() ? "pb-32" : "pb-10",
											)}
										>
											<AgentChatTranscript
												chat={chat}
												referenceDetails={referenceDetails()}
												selectedToolId={selectedId()}
												retriedToolIds={retriedTools()}
												onSelectTool={selectTool}
												onRespond={respond}
												canRetry={!unavailable()}
											/>
										</div>
									</div>
									<div
										aria-hidden="true"
										class={classnames(
											"pointer-events-none absolute inset-x-0 -bottom-2.5 bg-linear-to-t from-background to-transparent",
											attached() ? "h-18" : "h-10.5",
										)}
									/>
									<div
										aria-hidden="true"
										class="pointer-events-none absolute inset-x-0 top-0 h-8 bg-linear-to-b from-background to-transparent"
									/>
									<AgentChatTimeline
										messages={chat.messages}
										viewport={scroll.viewport()}
										onSelect={scroll.scrollToMessage}
									/>
									<Show when={scroll.loadingEarlier()}>
										<div class="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
											<Spinner size="sm" variant="subtle" />
										</div>
									</Show>
									<Show when={!scroll.following()}>
										<div
											class={classnames(
												"pointer-events-none absolute inset-x-0 flex justify-center",
												attached() ? "bottom-32" : "bottom-3",
											)}
										>
											<Button
												variant="secondary"
												size="xs"
												shape="circle"
												class="group pointer-events-auto shadow-md"
												aria-label={T()("agent.chat.latest")}
												title={T()("agent.chat.latest")}
												onClick={() => scroll.scrollToEnd("smooth")}
											>
												<Show
													when={chat.working() && !chat.pendingInteraction()}
													fallback={<TbOutlineArrowDown size={11} />}
												>
													<Spinner
														size="sm"
														variant="secondary"
														class="group-hover:hidden group-focus-visible:hidden"
													/>
													<TbOutlineArrowDown
														size={11}
														class="hidden group-hover:block group-focus-visible:block"
													/>
												</Show>
											</Button>
										</div>
									</Show>
								</div>
							</Match>
						</Switch>
						<Show when={!chat.conversation.isError}>
							<div class="relative mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 md:px-6 md:pb-6">
								<div class="-mx-2.5">
									<AgentChatComposer
										chat={chat}
										conversationId={params.conversationId}
										agent={agent()}
										routine={routine()}
										referenceDetails={referenceDetails()}
										ref={(handle) => {
											composer = handle;
										}}
										onAttachedChange={setAttached}
										onReferencesChange={(references) =>
											setAttachedKeys(
												references &&
													new Set(references.map(agentReferenceKey)),
											)
										}
										onRespond={respond}
										onSend={() => scroll.scrollToEnd("smooth")}
										onEditRoutineApprovals={() => {
											setFocusApprovals(true);
											setRoutineOpen(true);
										}}
									/>
								</div>
							</div>
						</Show>
					</section>
					<Show when={sidebarOpen() && conversation()}>
						{(current) => (
							<AgentChatSidebar
								ref={setSidebar}
								conversation={current()}
								routine={routineCard()}
								detailsOpen={detailsOpen()}
								selectedTool={selectedTool()}
								retriedToolIds={retriedTools()}
								onRoutineRun={(runId) => {
									//* older runs may not be loaded yet, and the runId link loads pages until it finds them
									if (chat.messages.some((message) => message.id === runId)) {
										scroll.scrollToMessage(runId);
									} else {
										navigate(`${location.pathname}?runId=${runId}`);
									}
								}}
								onRoutineRuns={() => setRunsOpen(true)}
								onRoutineOpen={() => {
									setFocusApprovals(false);
									setRoutineOpen(true);
								}}
								onRoutineClose={() => setRoutineCardOpen(false)}
								onDetailsClose={() => setDetailsOpen(false)}
								onToolClose={() => setSelectedId(undefined)}
							/>
						)}
					</Show>
				</div>
				<RunAgentRoutineModal
					id={() => routine()?.id}
					disabled={chat.working() || unavailable() !== undefined}
					state={{ open: runRoutineOpen(), setOpen: setRunRoutineOpen }}
					onRun={(conversationId) => {
						if (conversationId === params.conversationId) {
							scroll.scrollToEnd("smooth");
						} else {
							navigate(`/lucid/agent/chats/${conversationId}`);
						}
					}}
				/>
				<RenameAgentConversationModal
					conversation={conversation}
					state={{ open: renameOpen(), setOpen: setRenameOpen }}
				/>
				<UpsertAgentRoutineDrawer
					focusApprovals={focusApprovals()}
					routine={routine}
					state={{ open: routineOpen(), setOpen: setRoutineOpen }}
				/>
				<ViewAgentRoutineRunsDrawer
					id={() => routine()?.id}
					state={{ open: runsOpen(), setOpen: setRunsOpen }}
				/>
				<DeleteAgentConversationModal
					id={() => params.conversationId}
					state={{ open: deleteOpen(), setOpen: setDeleteOpen }}
					onDeleted={() => navigate(getNewChatHref())}
				/>
			</div>
		</AgentTranscriptContext.Provider>
	);
};

export default AgentConversationPage;
