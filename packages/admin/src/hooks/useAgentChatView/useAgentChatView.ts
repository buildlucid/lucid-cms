import type { AgentInteractionAction } from "@types";
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
} from "solid-js";
import type { AgentComposerHandle } from "@/components/AgentComposer/AgentComposer";
import type { AgentMediaAttachments } from "@/components/AgentTranscriptRow/AgentTranscriptContext";
import type { AgentChat } from "@/hooks/useAgentChat/useAgentChat";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getAgentUnavailableReason } from "@/utils/agent-access";
import {
	type AgentReferenceItem,
	agentReferenceKey,
	canAttachMedia,
} from "@/utils/agent-references";
import { isToolRow, retriedToolIds } from "@/utils/agent-tools";

/**
 * What a view of a chat needs around its transcript and chat box: details of
 * linked resources, the agent, the selected tool call, answers to the agent's
 * questions and media attachments. Used by the chat page and the agent panel.
 * Escape or another chat clears the selected call.
 */
export const useAgentChatView = (props: {
	chat: AgentChat;
	conversationId: Accessor<string | undefined>;
}) => {
	// ----------------------------------------
	// State & Hooks
	const definitions = api.agent.useGetDefinitions();
	const [selectedId, setSelectedId] = createSignal<string>();
	const [attachedKeys, setAttachedKeys] = createSignal<ReadonlySet<string>>();
	const [composer, setComposer] = createSignal<AgentComposerHandle>();

	// ----------------------------------------
	// Queries
	const references = api.agent.useGetReferences({
		id: () => props.chat.data()?.id,
	});

	// ----------------------------------------
	// Memos
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
			(agent) => agent.key === props.chat.data()?.agentKey,
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
				composer()?.toggleReference({ type: "media", mediaId: media.id }),
		};
	});
	const selectedTool = createMemo(() =>
		props.chat.messages
			.flatMap((message) =>
				message.parts
					.filter(isToolRow)
					.map((part) => ({ messageId: message.id, part })),
			)
			.find((tool) => tool.part.id === selectedId()),
	);
	const retriedTools = createMemo(() => retriedToolIds(props.chat.messages));

	// ----------------------------------------
	// Functions
	/** Answers the agent's pending question or confirmation, then returns focus to the chat box for inline ones. */
	const respond = async (
		interactionId: string,
		response: Record<string, unknown>,
		action: AgentInteractionAction = "submit",
	) => {
		const reason = unavailable();
		if (reason) return { error: T()(`agent.unavailable.${reason}.title`) };
		const pending = props.chat.pendingInteraction();
		if (!pending || pending.id !== interactionId) {
			return { error: T()("agent.interaction.unavailable") };
		}

		const result = await props.chat.respond(pending, response, action);
		if (
			result.error === undefined &&
			pending.widget.interaction?.placement === "inline"
		) {
			composer()?.focus();
		}

		return result;
	};

	// ----------------------------------------
	// Effects
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
		on(props.conversationId, () => setSelectedId(undefined), { defer: true }),
	);

	// ----------------------------------------
	// Return
	return {
		agent,
		unavailable,
		referenceDetails,
		mediaAttachments,
		selectedId,
		setSelectedId,
		/** Selecting the selected call again closes it. */
		selectTool: (id: string) =>
			setSelectedId((current) => (current === id ? undefined : id)),
		selectedTool,
		retriedTools,
		respond,
		composer,
		setComposer,
		onReferencesChange: (items: AgentReferenceItem[] | undefined) =>
			setAttachedKeys(items && new Set(items.map(agentReferenceKey))),
	};
};

export type AgentChatView = ReturnType<typeof useAgentChatView>;

export default useAgentChatView;
