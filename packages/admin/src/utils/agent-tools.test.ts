import type { AgentMessage } from "@types";
import { expect, it } from "vitest";
import { type AgentToolPart, retriedToolIds } from "./agent-tools";

const tool = (
	id: string,
	name: string,
	status: AgentToolPart["status"],
): AgentToolPart => ({
	type: "tool",
	id,
	name,
	summary: { type: "lucid.literal", value: name },
	detailsAvailable: true,
	status,
});
const message = (
	id: string,
	runId: string | null,
	parts: AgentToolPart[],
): AgentMessage => ({
	id,
	conversationId: "conversation",
	runId,
	position: 0,
	role: "assistant",
	parts,
	createdAt: null,
});

it("marks failures retried only once a later call to the same tool in the run completes", () => {
	expect(
		retriedToolIds([
			message("m1", "run-1", [
				tool("create-1", "documents_create", "failed"),
				tool("search", "web_search", "failed"),
			]),
			message("m2", "run-1", [
				tool("create-2", "documents_create", "failed"),
				tool("create-3", "documents_create", "complete"),
				tool("update-1", "documents_update", "failed"),
			]),
			message("m3", "run-2", [tool("search-2", "web_search", "complete")]),
		]),
	).toEqual(new Set(["create-1", "create-2"]));
});
