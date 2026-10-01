import type { Media } from "@types";
import { type Accessor, createContext, useContext } from "solid-js";

export interface AgentMediaAttachments {
	canAttach: (_media: Media) => boolean;
	isAttached: (_mediaId: number) => boolean;
	toggle: (_media: Media) => void;
}

export interface AgentTranscriptContextValue {
	selected: Accessor<string | undefined>;
	select: (_id: string | undefined) => void;
	sidebar: Accessor<HTMLElement | undefined>;
	/** Undefined when the chat box is hidden or the agent is unavailable. */
	mediaAttachments: Accessor<AgentMediaAttachments | undefined>;
}

export const AgentTranscriptContext =
	createContext<AgentTranscriptContextValue>();

/** Undefined outside a chat, where rows expand in place instead. */
export const useAgentTranscript = () => useContext(AgentTranscriptContext);
