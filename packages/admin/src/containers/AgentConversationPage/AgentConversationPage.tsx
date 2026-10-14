import { useLocation, useNavigate, useParams } from "@solidjs/router";
import classnames from "classnames";
import {
	type Component,
	createComputed,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
	Show,
} from "solid-js";
import AgentChatHeader from "@/components/AgentChatHeader/AgentChatHeader";
import AgentChatThread from "@/components/AgentChatThread/AgentChatThread";
import AgentDetailsDialog from "@/components/AgentDetailsDialog/AgentDetailsDialog";
import { AgentTranscriptContext } from "@/components/AgentTranscriptRow/AgentTranscriptContext";
import DeleteAgentConversationModal from "@/components/DeleteAgentConversationModal/DeleteAgentConversationModal";
import Link from "@/components/Link/Link";
import RenameAgentConversationModal from "@/components/RenameAgentConversationModal/RenameAgentConversationModal";
import RunAgentRoutineModal from "@/components/RunAgentRoutineModal/RunAgentRoutineModal";
import UpsertAgentRoutineDrawer from "@/components/UpsertAgentRoutineDrawer/UpsertAgentRoutineDrawer";
import ViewAgentRoutineRunsDrawer from "@/components/ViewAgentRoutineRunsDrawer/ViewAgentRoutineRunsDrawer";
import useAgentChatView from "@/hooks/useAgentChatView/useAgentChatView";
import { useAgentSession } from "@/hooks/useAgentSession/useAgentSession";
import useChatScroll from "@/hooks/useChatScroll/useChatScroll";
import { useMediaQuery } from "@/hooks/useMediaQuery/useMediaQuery";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import T from "@/translations";
import { getAgentAccess } from "@/utils/agent-access";
import { getNewChatHref } from "@/utils/home-view";
import { isModifiedClick, isNavigationLinkActive } from "@/utils/navigation";
import AgentChatActions from "./parts/AgentChatActions";
import AgentChatSidebar from "./parts/AgentChatSidebar";

/**
 * A single chat with the agent: a header, then messages that scroll on their
 * own with the chat box, or a question box while the agent waits on an answer,
 * fixed below them. A tool call opens in a floating panel beside the chat,
 * which closes with its close button, Escape, or by selecting the call again.
 * The chat's details card sits above it, toggled from the header and
 * remembered between chats. The chat is the one open across the admin, so
 * leaving for something it links to keeps it open in the agent panel.
 */
const AgentConversationPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const params = useParams<{ conversationId: string }>();
	const location = useLocation();
	const navigate = useNavigate();
	const session = useAgentSession();
	const chat = session.chat;
	const view = useAgentChatView({
		chat,
		conversationId: () => params.conversationId,
	});
	const scroll = useChatScroll({
		hasEarlier: () => chat.history.hasNextPage,
		loadEarlier: () => chat.history.fetchNextPage(),
	});
	const [renameOpen, setRenameOpen] = createSignal(false);
	const [deleteOpen, setDeleteOpen] = createSignal(false);
	const [sidebar, setSidebar] = createSignal<HTMLElement>();
	const [details, setDetails] = createSignal<HTMLElement>();
	//* the sidebar shows from lg; narrower chats open details in a dialog instead
	const lg = useMediaQuery("(width >= 64rem)");
	const xl = useMediaQuery("(width >= 80rem)");
	const [routineOpen, setRoutineOpen] = createSignal(false);
	const [runRoutineOpen, setRunRoutineOpen] = createSignal(false);
	const [focusConfirmations, setFocusConfirmations] = createSignal(false);
	const [routineCardOpen, setRoutineCardOpen] = createSignal(true);
	const [runsOpen, setRunsOpen] = createSignal(false);

	// ----------------------------------------
	// Memos
	const conversation = createMemo(() => chat.data());
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
		() => routineCard() !== undefined || detailsOpen() || !!view.selectedId(),
	);

	// ----------------------------------------
	// Functions
	const setDetailsOpen = (open: boolean) =>
		userPreferencesStore.setSectionOpen("agent.chat.details", open);
	/** Following a link out of the agent's pages keeps this chat open beside what it opens, where the panel docks. */
	const dockOnLeave = (event: MouseEvent) => {
		//* the panel docks from xl, and would cover what the link opens on smaller screens
		if (isModifiedClick(event) || !xl()) return;
		const link =
			event.target instanceof Element ? event.target.closest("a") : null;
		const href = link?.getAttribute("href");
		if (
			!href?.startsWith("/lucid/") ||
			isNavigationLinkActive(href, "/lucid/agent") ||
			link?.target === "_blank"
		) {
			return;
		}
		session.panel.setOpen(true);
	};

	// ----------------------------------------
	// Effects
	usePageTitle(() => conversation()?.title || T()("agent.chat.new"));

	//* set before the first render, so the page never shows the chat open before it
	createComputed(() => session.open(params.conversationId));
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
	createEffect(
		on(
			[() => params.conversationId, () => location.search],
			() => {
				view.setSelectedId(undefined);
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
				selected: view.selectedId,
				select: view.setSelectedId,
				sidebar: () => (lg() ? sidebar() : details()),
				mediaAttachments: view.mediaAttachments,
			}}
		>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: only watches clicks on the links inside */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: links fire click events from the keyboard too */}
			<div
				data-agent-chat
				onClick={dockOnLeave}
				class="flex h-[calc(100dvh-4.25rem)] flex-col overflow-hidden rounded-t-xl border-x border-t border-border bg-background bg-clip-padding md:h-[calc(100dvh-1rem)]"
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
												view.unavailable() !== undefined,
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
						<AgentChatThread
							chat={chat}
							view={view}
							scroll={scroll}
							conversationId={params.conversationId}
							variant="page"
							routine={routine()}
							missingAction={
								<Show when={getAgentAccess().chat.length > 0}>
									<Link variant="primary" size="sm" href={getNewChatHref()}>
										{T()("agent.chat.new")}
									</Link>
								</Show>
							}
							onEditRoutineConfirmations={() => {
								setFocusConfirmations(true);
								setRoutineOpen(true);
							}}
							onBranched={(conversationId) =>
								navigate(`/lucid/agent/chats/${conversationId}`)
							}
						/>
					</section>
					<Show when={sidebarOpen() && conversation()}>
						{(current) => (
							<AgentChatSidebar
								ref={setSidebar}
								conversation={current()}
								routine={routineCard()}
								detailsOpen={detailsOpen()}
								selectedTool={lg() ? view.selectedTool() : undefined}
								retriedToolIds={view.retriedTools()}
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
									setFocusConfirmations(false);
									setRoutineOpen(true);
								}}
								onRoutineClose={() => setRoutineCardOpen(false)}
								onDetailsClose={() => setDetailsOpen(false)}
								onToolClose={() => view.setSelectedId(undefined)}
							/>
						)}
					</Show>
				</div>
				<Show when={!lg()}>
					<AgentDetailsDialog
						view={view}
						conversationId={params.conversationId}
						ref={setDetails}
					/>
				</Show>
				<RunAgentRoutineModal
					id={() => routine()?.id}
					disabled={chat.working() || view.unavailable() !== undefined}
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
					focusConfirmations={focusConfirmations()}
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
					onDeleted={() => {
						session.open(undefined);
						navigate(getNewChatHref());
					}}
				/>
			</div>
		</AgentTranscriptContext.Provider>
	);
};

export default AgentConversationPage;
