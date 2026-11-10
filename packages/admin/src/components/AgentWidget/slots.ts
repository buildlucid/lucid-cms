import type { AgentMessagePart, AgentWidgetPart } from "@types";
import { agentSlots } from "virtual:lucid-admin";
import { matchSlots } from "@/extensions/match-slots";
import { partLayout } from "@/utils/agent-chat";

type AgentSlot = (typeof agentSlots)[number];

const isSlot = <Slot extends AgentSlot["slot"]>(
	entry: AgentSlot,
	slot: Slot,
): entry is Extract<AgentSlot, { slot: Slot }> => entry.slot === slot;

//* registered slots never change while the admin runs, so each lookup is worked out once
const resolved = new Map<string, AgentSlot | undefined>();

export const resolveAgentSlot = <Slot extends AgentSlot["slot"]>(
	slot: Slot,
	widget: Pick<AgentWidgetPart, "key" | "version">,
) => {
	const id = `${slot}:${widget.key}@${widget.version}`;
	if (!resolved.has(id)) {
		resolved.set(
			id,
			matchSlots(
				agentSlots.filter((entry) => isSlot(entry, slot)),
				{ widget: widget.key, version: widget.version },
			)[0],
		);
	}
	const entry = resolved.get(id);
	return entry && isSlot(entry, slot) ? entry : undefined;
};

export const layoutOf = (part: AgentMessagePart) =>
	partLayout(
		part,
		(widget) => resolveAgentSlot("agent.transcriptRow", widget) !== undefined,
	);
