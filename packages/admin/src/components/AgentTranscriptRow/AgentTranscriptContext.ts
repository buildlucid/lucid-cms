import { type Accessor, createContext, useContext } from "solid-js";

export interface AgentTranscriptContextValue {
	selected: Accessor<string | undefined>;
	select: (_id: string | undefined) => void;
	sidebar: Accessor<HTMLElement | undefined>;
}

export const AgentTranscriptContext =
	createContext<AgentTranscriptContextValue>();

/** Undefined outside a chat, where rows expand in place instead. */
export const useAgentTranscript = () => useContext(AgentTranscriptContext);
