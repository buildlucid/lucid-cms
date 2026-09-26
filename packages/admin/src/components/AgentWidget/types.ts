import type { Component } from "solid-js";
import type { AdminOptions } from "../../extensions/types/config.js";

export type AgentWidgetMatch = {
	widget: string;
	version: number;
};

/**
 * Data returned by a tool, rendered by its matching admin slot. Widgets sit in
 * the flow of the agent's reply, so keep them light: a thin `border-border`
 * outline or none, no filled card, and the admin's text colours.
 */
export type AgentWidgetProps<
	TOptions extends AdminOptions | undefined = undefined,
> = {
	readonly slot: "agent.widget";
	readonly key: string;
	readonly version: number;
	readonly data: Record<string, unknown>;
	readonly options: TOptions;
};

export type AgentWidgetComponent<
	TOptions extends AdminOptions | undefined = undefined,
> = Component<AgentWidgetProps<TOptions>>;
