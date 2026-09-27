import { agentSlots } from "virtual:lucid-admin";
import type { AgentMessagePart, AgentWidgetPart } from "@types";
import { resolveSlots } from "@/extensions/slot-policy";
import { partLayout } from "@/utils/agent-chat";

type AgentSlot = (typeof agentSlots)[number];

export const resolveAgentSlot = <Slot extends AgentSlot["slot"]>(
	slot: Slot,
	widget: Pick<AgentWidgetPart, "key" | "version">,
) =>
	resolveSlots(
		agentSlots.filter(
			(entry): entry is Extract<AgentSlot, { slot: Slot }> =>
				entry.slot === slot,
		),
		{ widget: widget.key, version: widget.version },
	)[0];

export const layoutOf = (part: AgentMessagePart) =>
	partLayout(
		part,
		(widget) => resolveAgentSlot("agent.transcriptRow", widget) !== undefined,
	);
