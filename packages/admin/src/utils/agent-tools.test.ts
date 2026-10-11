import type { AgentMessage } from "@types";
import { expect, it } from "vitest";
import {
	type AgentToolPart,
	imageSizeRatio,
	isGeneratingImage,
	isToolRow,
	retriedToolIds,
} from "./agent-tools";

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

it("shows a placeholder only while an image tool runs, not while it waits on the person", () => {
	const generating = tool("image", "media_generate_image", "running");
	expect(isGeneratingImage(generating)).toBe(true);
	expect(isGeneratingImage({ ...generating, name: "media_edit_image" })).toBe(
		true,
	);
	expect(isGeneratingImage({ ...generating, status: "pending" })).toBe(false);
	expect(isGeneratingImage({ ...generating, status: "complete" })).toBe(false);
	expect(isGeneratingImage(tool("search", "web_search", "running"))).toBe(
		false,
	);
	expect(isToolRow(generating)).toBe(true);
});

it("reads the tile's shape from the requested size", () => {
	expect(imageSizeRatio({ size: "1536x1024" })).toBe(1.5);
	expect(imageSizeRatio({ size: "1024x1536" })).toBeCloseTo(2 / 3);
	expect(imageSizeRatio({ size: "auto" })).toBe(1);
	expect(imageSizeRatio(undefined)).toBe(1);
});
