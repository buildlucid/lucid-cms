import type { AgentMessage } from "@types";
import { expect, it } from "vitest";
import {
	type AgentToolPart,
	generatingMediaType,
	imageAspectRatio,
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

it("shows a placeholder only while a media tool runs, not while it waits on the person", () => {
	const generating = tool("image", "media_generate_image", "running");
	expect(generatingMediaType(generating)).toBe("image");
	expect(generatingMediaType({ ...generating, name: "media_edit_image" })).toBe(
		"image",
	);
	expect(
		generatingMediaType({ ...generating, name: "media_generate_audio" }),
	).toBe("audio");
	expect(generatingMediaType({ ...generating, status: "pending" })).toBe(
		undefined,
	);
	expect(generatingMediaType({ ...generating, status: "complete" })).toBe(
		undefined,
	);
	expect(
		generatingMediaType(tool("search", "web_search", "running")),
	).toBeUndefined();
	expect(isToolRow(generating)).toBe(true);
});

it("reads the tile's shape from the requested aspect ratio", () => {
	expect(imageAspectRatio({ aspectRatio: "3:2" })).toBe(1.5);
	expect(imageAspectRatio({ aspectRatio: "9:16" })).toBeCloseTo(9 / 16);
	expect(imageAspectRatio({ aspectRatio: "auto" })).toBe(1);
	expect(imageAspectRatio(undefined)).toBe(1);
});
