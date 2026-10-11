import { useLocation, useNavigate } from "@solidjs/router";
import type {
	Agent,
	AgentBuilderChangesData,
	AgentConfirmationMode,
	AgentScreen,
	AgentScreenCall,
	AgentScreenResponse,
	AiModelSelection,
} from "@types";
import {
	type Accessor,
	batch,
	createContext,
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
	type ParentComponent,
	untrack,
	useContext,
} from "solid-js";
import {
	readDraft,
	restoreSubmittedDraft,
	writeDraft,
} from "@/components/AgentComposer/draft";
import AgentRequestWatcher from "@/components/AgentRequestWatcher/AgentRequestWatcher";
import useAgentChat, {
	type AgentChat,
} from "@/hooks/useAgentChat/useAgentChat";
import { useMediaQuery } from "@/hooks/useMediaQuery/useMediaQuery";
import api from "@/services/api";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import { getAgentAccess } from "@/utils/agent-access";
import {
	type AgentReferenceItem,
	mergeAgentReferences,
} from "@/utils/agent-references";
import { isSameScreen, showsDocument } from "@/utils/agent-screen";
import { getHomeView } from "@/utils/home-view";
import { isNavigationLinkActive } from "@/utils/navigation";
import { getDocumentRoute, getRequestRoute } from "@/utils/route-helpers";
import { tabId } from "@/utils/tab-id";

//* the panel's chat is kept per tab, like chat box drafts
const chatStorageKey = "lucid:agent-session";

/** A message the agent did not accept, waiting to go back into its chat's box. */
type ReturnedMessage = {
	conversationId: string;
	text: string;
	references: AgentReferenceItem[];
};

/** A field or brick to show in the document builder. */
export type AgentBuilderFocus = {
	/** A builder brick's ref or a fixed brick's key. Omit it for the document's own fields. */
	brick?: string;
	/** Field keys interleaved with repeater item refs, such as `["items", "Xy12ab", "title"]`, with an empty path showing the brick. */
	path: string[];
	/** Switches the editor to this content language first. */
	contentLocale?: string;
};

type BuilderDocument = AgentBuilderChangesData["document"];

/** An admin screen open in this tab, which tells the agent where the person is. The document builder also answers its builder tools. */
export type AgentScreenRegistration = {
	screen: Accessor<AgentScreen | undefined>;
	/** Answers a call made for this screen. Screens that only tell the agent where the person is leave it out. */
	answer?: (call: AgentScreenCall) => Promise<AgentScreenResponse>;
	/** Shows a field or brick and reports whether it was found, omitted for screens without a builder. */
	focus?: (target: AgentBuilderFocus) => Promise<boolean>;
};

export type AgentSession = {
	/** The open chat, shared by the agent panel and the chat page. */
	chat: AgentChat;
	conversationId: Accessor<string | undefined>;
	/** Shows a chat, or the new chat box when undefined. */
	open: (conversationId: string | undefined) => void;
	/**
	 * Opens a new chat straight away, then saves it and sends its first
	 * message. `created` resolves false when it could not be saved; the message
	 * then goes back to the new chat box and the session shows it again.
	 */
	start: (input: {
		text: string;
		references: AgentReferenceItem[];
		agentKey: string;
		confirmationMode: AgentConfirmationMode;
		modelSelection?: AiModelSelection;
	}) => { id: string; created: Promise<boolean> };
	returned: Accessor<ReturnedMessage | undefined>;
	/** Takes the returned message for a chat box to restore. */
	takeReturned: () => void;
	/** Adds resources to the chat box, eg. items selected in a list, opening the panel to show it. */
	attach: (references: AgentReferenceItem[]) => void;
	/** Identifies the sidebar agent receiving attached resources so lists offer supported items, returning undefined while details load or no agent is available. */
	attachAgent: Accessor<Agent | undefined>;
	/** Resources waiting for the shown chat box to take. */
	attached: Accessor<AgentReferenceItem[] | undefined>;
	takeAttached: () => void;
	panel: {
		/** Allows the panel when the reader can chat with a sidebar agent and the current page does not already show an agent chat. */
		available: Accessor<boolean>;
		/** Whether the reader keeps the panel open, remembered between visits. */
		open: Accessor<boolean>;
		setOpen: (open: boolean) => void;
		/** Whether the panel shows here. */
		visible: Accessor<boolean>;
		/** Whether the panel shows docked beside the content, from xl, taking its width. */
		docked: Accessor<boolean>;
	};
	screen: {
		/** The screen this tab has open, sent with messages so the agent knows what the person sees. */
		current: Accessor<AgentScreen | undefined>;
		/** Registers this tab's screen context and tool handler, returning a function that unregisters them. */
		register: (registration: AgentScreenRegistration) => () => void;
		/** Shows a field or brick in a document's builder, opening the document first when this tab shows something else. */
		focus: (document: BuilderDocument, target: AgentBuilderFocus) => void;
	};
};

const readChat = () => {
	try {
		return sessionStorage.getItem(chatStorageKey) ?? undefined;
	} catch {
		return undefined;
	}
};

const writeChat = (conversationId: string | undefined) => {
	try {
		if (conversationId) sessionStorage.setItem(chatStorageKey, conversationId);
		else sessionStorage.removeItem(chatStorageKey);
	} catch {}
};

const AgentSessionContext = createContext<AgentSession>();

/** Shares streaming chat across admin views, refreshes affected pages after tool changes or completed jobs, and answers this tab's builder calls while the panel is closed. */
export const AgentSessionProvider: ParentComponent = (props) => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();
	const navigate = useNavigate();
	const xl = useMediaQuery("(width >= 80rem)");
	const [conversationId, setConversationId] = createSignal(readChat());
	//* a new chat opens before it is saved, so its chat waits to load until it is
	const [creating, setCreating] = createSignal<string>();
	const [returned, setReturned] = createSignal<ReturnedMessage>();
	const [attached, setAttached] = createSignal<AgentReferenceItem[]>();
	//* requests the agent changed, followed until any completion they started has run
	const [watchedRequests, setWatchedRequests] = createSignal<
		ReadonlySet<number>
	>(new Set());
	const [screenRegistration, setScreenRegistration] =
		createSignal<AgentScreenRegistration>();
	//* screen calls this tab is answering, so a call is answered once
	const answering = new Set<string>();
	//* a field to show once the document opened for it is ready
	const [pendingFocus, setPendingFocus] = createSignal<{
		document: BuilderDocument;
		target: AgentBuilderFocus;
	}>();

	// ----------------------------------------
	// Memos
	const canChat = createMemo(() => getAgentAccess().chat.length > 0);
	const onAgentPage = createMemo(
		() =>
			isNavigationLinkActive(location.pathname, "/lucid/agent") ||
			(isNavigationLinkActive(location.pathname, "/lucid") &&
				getHomeView() === "ask"),
	);
	const panelAvailable = createMemo(
		() => getAgentAccess().sidebar.length > 0 && !onAgentPage(),
	);
	const panelOpen = createMemo(
		() => userPreferencesStore.getSectionOpen("agent.panel") ?? false,
	);
	const panelVisible = createMemo(() => panelAvailable() && panelOpen());
	const currentScreen = createMemo(() => screenRegistration()?.screen());

	// ----------------------------------------
	// Queries & Mutations
	const createConversation = api.agent.useCreateConversation();
	const definitions = api.agent.useGetDefinitions({ enabled: canChat });
	const chat = useAgentChat(
		() => {
			const id = conversationId();
			return id !== creating() && canChat() ? id : undefined;
		},
		{
			onChanges: (changes) => {
				const requestIds = changes.flatMap((change) =>
					change.type === "request" ? [change.requestId] : [],
				);
				if (requestIds.length === 0) return;
				setWatchedRequests((current) => new Set([...current, ...requestIds]));
			},
			screen: currentScreen,
		},
	);

	// ----------------------------------------
	// Memos
	//* the panel shows the open chat when its agent is a sidebar one, and otherwise the new chat box's agent
	const attachAgent = createMemo(() => {
		const sidebar = getAgentAccess().sidebar;
		const key =
			[chat.data()?.agentKey, userPreferencesStore.getAgentKey()].find(
				(candidate) => sidebar.some((agent) => agent.key === candidate),
			) ?? sidebar[0]?.key;
		return definitions.data?.data.agents.find((agent) => agent.key === key);
	});

	// ----------------------------------------
	// Functions
	const start: AgentSession["start"] = (input) => {
		const id = crypto.randomUUID();
		const message = { text: input.text, references: input.references };
		batch(() => {
			setCreating(id);
			setConversationId(id);
		});

		const created = (async () => {
			try {
				await createConversation.action.mutateAsync({
					id,
					agentKey: input.agentKey,
					confirmationMode: input.confirmationMode,
					modelSelection: input.modelSelection,
				});
			} catch {
				writeDraft("new", restoreSubmittedDraft(message, readDraft("new")));
				batch(() => {
					setCreating(undefined);
					if (conversationId() === id) setConversationId(undefined);
				});
				return false;
			}

			setCreating(undefined);
			const sent =
				conversationId() === id &&
				(await chat.send(input.text, "send", input.references));
			if (!sent) setReturned({ conversationId: id, ...message });
			return true;
		})();

		return { id, created };
	};

	const focusBuilder: AgentSession["screen"]["focus"] = (document, target) => {
		const registration = untrack(screenRegistration);
		const screen = registration?.screen();
		if (screen && showsDocument(screen, document)) {
			void registration?.focus?.(target);
			return;
		}
		//* a document that was never saved has no page to open
		if (document.documentId === null) return;

		setPendingFocus({ document, target });
		navigate(
			document.requestId === null
				? getDocumentRoute("edit", {
						collectionKey: document.collectionKey,
						documentId: document.documentId,
					})
				: getRequestRoute({
						requestId: document.requestId,
						content: {
							collectionKey: document.collectionKey,
							documentId: document.documentId,
						},
					}),
		);
	};

	/** Answers a screen call made from this tab, or says the screen has gone when it isn't open any more. */
	const answerScreenCall = async (
		pending: NonNullable<ReturnType<AgentChat["screenCall"]>>,
	) => {
		const registration = untrack(screenRegistration);
		const screen = registration?.screen();
		const same =
			screen !== undefined && isSameScreen(screen, pending.call.screen);
		const response: AgentScreenResponse =
			same && registration?.answer
				? await registration
						.answer(pending.call)
						.catch(() => ({ status: "unavailable", reason: "closed" }))
				: {
						status: "unavailable",
						reason: screen && !same ? "moved" : "closed",
						screen,
					};

		const result = await chat.respond(
			{ runId: pending.runId, id: pending.id },
			response,
		);
		//* a call that couldn't be answered yet is tried again when the chat next shows it
		if (result.error) answering.delete(pending.id);
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!creating()) writeChat(conversationId());
	});
	//* the builder registers its screen once its document has loaded, so it can show the field then
	createEffect(
		on(currentScreen, (screen) => {
			const pending = untrack(pendingFocus);
			if (!pending || !screen) return;

			setPendingFocus(undefined);
			if (showsDocument(screen, pending.document)) {
				void untrack(screenRegistration)?.focus?.(pending.target);
			}
		}),
	);
	//* other tabs answer the calls made for their screens
	createEffect(
		on(chat.screenCall, (pending) => {
			if (!pending || pending.call.screen.tabId !== tabId) return;
			if (answering.has(pending.id)) return;

			answering.add(pending.id);
			void answerScreenCall(pending);
		}),
	);

	// ----------------------------------------
	// Render
	return (
		<AgentSessionContext.Provider
			value={{
				chat,
				conversationId,
				open: (id) => setConversationId(id),
				start,
				returned,
				takeReturned: () => setReturned(undefined),
				attach: (references) =>
					batch(() => {
						setAttached((current) =>
							mergeAgentReferences(current ?? [], references),
						);
						userPreferencesStore.setSectionOpen("agent.panel", true);
					}),
				attachAgent,
				attached,
				takeAttached: () => setAttached(undefined),
				panel: {
					available: panelAvailable,
					open: panelOpen,
					setOpen: (open) =>
						userPreferencesStore.setSectionOpen("agent.panel", open),
					visible: panelVisible,
					docked: () => panelVisible() && xl(),
				},
				screen: {
					current: currentScreen,
					register: (registration) => {
						setScreenRegistration(() => registration);
						return () =>
							setScreenRegistration((current) =>
								current === registration ? undefined : current,
							);
					},
					focus: focusBuilder,
				},
			}}
		>
			{props.children}
			<For each={[...watchedRequests()]}>
				{(requestId) => (
					<AgentRequestWatcher
						requestId={requestId}
						onSettled={() =>
							setWatchedRequests(
								(current) =>
									new Set([...current].filter((id) => id !== requestId)),
							)
						}
					/>
				)}
			</For>
		</AgentSessionContext.Provider>
	);
};

/** The chat open across the admin. Only available inside the navigation shell. */
export const useAgentSession = () => {
	const session = useContext(AgentSessionContext);
	if (!session) {
		throw new Error(
			"useAgentSession must be used inside AgentSessionProvider.",
		);
	}
	return session;
};
