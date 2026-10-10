import { useLocation } from "@solidjs/router";
import type { AgentConfirmationMode, AiModelSelection } from "@types";
import {
	type Accessor,
	batch,
	createContext,
	createEffect,
	createMemo,
	createSignal,
	For,
	type ParentComponent,
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
import type { AgentReferenceItem } from "@/utils/agent-references";
import { getHomeView } from "@/utils/home-view";
import { isNavigationLinkActive } from "@/utils/navigation";

//* the panel's chat is kept per tab, like chat box drafts
const chatStorageKey = "lucid:agent-session";

/** A message the agent did not accept, waiting to go back into its chat's box. */
type ReturnedMessage = {
	conversationId: string;
	text: string;
	references: AgentReferenceItem[];
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
	panel: {
		/** Whether the panel can show here. The agent's own pages already show the chat. */
		available: Accessor<boolean>;
		/** Whether the reader keeps the panel open, remembered between visits. */
		open: Accessor<boolean>;
		setOpen: (open: boolean) => void;
		/** Whether the panel shows here. */
		visible: Accessor<boolean>;
		/** Whether the panel shows docked beside the content, from xl, taking its width. */
		docked: Accessor<boolean>;
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

/**
 * Keeps one agent chat open across the admin, so the panel and the chat page
 * show the same chat and its replies keep streaming while the reader moves
 * between pages. Tool calls that change documents, requests or media refresh
 * the pages showing them, and completions the agent starts refresh them again
 * once they have run.
 */
export const AgentSessionProvider: ParentComponent = (props) => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();
	const xl = useMediaQuery("(width >= 80rem)");
	const [conversationId, setConversationId] = createSignal(readChat());
	//* a new chat opens before it is saved, so its chat waits to load until it is
	const [creating, setCreating] = createSignal<string>();
	const [returned, setReturned] = createSignal<ReturnedMessage>();
	//* requests the agent changed, followed until any completion they started has run
	const [watchedRequests, setWatchedRequests] = createSignal<
		ReadonlySet<number>
	>(new Set());

	// ----------------------------------------
	// Memos
	const canChat = createMemo(() => getAgentAccess().chat.length > 0);
	const onAgentPage = createMemo(
		() =>
			isNavigationLinkActive(location.pathname, "/lucid/agent") ||
			(isNavigationLinkActive(location.pathname, "/lucid") &&
				getHomeView() === "ask"),
	);
	const panelAvailable = createMemo(() => canChat() && !onAgentPage());
	const panelOpen = createMemo(
		() => userPreferencesStore.getSectionOpen("agent.panel") ?? false,
	);
	const panelVisible = createMemo(() => panelAvailable() && panelOpen());

	// ----------------------------------------
	// Queries & Mutations
	const createConversation = api.agent.useCreateConversation();
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
		},
	);

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

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!creating()) writeChat(conversationId());
	});

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
				panel: {
					available: panelAvailable,
					open: panelOpen,
					setOpen: (open) =>
						userPreferencesStore.setSectionOpen("agent.panel", open),
					visible: panelVisible,
					docked: () => panelVisible() && xl(),
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
