import type { AgentInteraction } from "@types";
import type { Component } from "solid-js";
import type { AdminOptions } from "../../extensions/types/config.js";
import type { agentWidgetSlotPolicies } from "./constants.js";

export type AgentSlot = keyof typeof agentWidgetSlotPolicies;

export type AgentWidgetMatch = {
	widget: string;
	version: number;
};

export type AgentSlotPlacement = {
	[Slot in AgentSlot]: { slot: Slot; match: AgentWidgetMatch };
}[AgentSlot];

export type AgentWidgetSubmitResult = { error: string } | { error: undefined };

/** A pending interaction, as its widget sees it. Only the active one accepts a response. */
export type AgentWidgetInteraction<Response = Record<string, unknown>> =
	| {
			status: "active";
			submitting: boolean;
			error?: string;
			/** Publish valid form values; undefined disables the host action. */
			setResponse: (response: Response | undefined) => void;
	  }
	| { status: "inactive" };

export type AgentWidgetProps<
	TOptions extends AdminOptions | undefined = undefined,
	Data = Record<string, unknown>,
	Response = Record<string, unknown>,
> = {
	readonly slot: "agent.widget";
	readonly key: string;
	readonly version: number;
	readonly data: Data;
	readonly options: TOptions;
	readonly view: "inline" | "composer";
	readonly interaction?: AgentWidgetInteraction<Response>;
};

export type AgentWidgetComponent<
	TOptions extends AdminOptions | undefined = undefined,
> = Component<AgentWidgetProps<TOptions>>;

/** A registered row replaces the inline result card and can open a sidebar panel. */
export type AgentTranscriptRowSlotProps<
	TOptions extends AdminOptions | undefined = undefined,
	Data = Record<string, unknown>,
> = {
	readonly slot: "agent.transcriptRow";
	readonly key: string;
	readonly version: number;
	readonly data: Data;
	readonly options: TOptions;
	readonly interaction?: AgentInteraction;
	readonly status?: string;
};

export type AgentTranscriptRowSlotComponent<
	TOptions extends AdminOptions | undefined = undefined,
> = Component<AgentTranscriptRowSlotProps<TOptions>>;
