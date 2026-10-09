import type {
	AgentFileReadOutput,
	AgentLucidToolName,
	AgentMessage,
	AgentMessagePart,
	AgentRunnerToolName,
	AgentRunnerWidgetKey,
	AgentWebFetchOutput,
	AgentWebSearchOutput,
	AgentWidgetPart,
} from "@types";
import { isObjectRecord } from "@/utils/type-guards";

export type AgentToolPart = Extract<AgentMessagePart, { type: "tool" }>;

//* typed against the server's names, so a rename there fails to compile here
export const previewMediaTool =
	"lucid_preview_media" satisfies AgentRunnerToolName;
export const previewMediaWidget =
	"lucid-media-preview" satisfies AgentRunnerWidgetKey;
export const askTool = "lucid_ask_user" satisfies AgentRunnerToolName;
export const finishTool = "lucid_finish_run" satisfies AgentRunnerToolName;
export const progressTool =
	"lucid_share_progress" satisfies AgentRunnerToolName;
export const skillTool = "lucid_load_skill" satisfies AgentRunnerToolName;
export const registerReferencesTool =
	"lucid_register_references" satisfies AgentRunnerToolName;
export const removeReferenceTool =
	"lucid_remove_reference" satisfies AgentRunnerToolName;
export const questionWidget = "lucid-question" satisfies AgentRunnerWidgetKey;
export const approvalWidget =
	"lucid-tool-approval" satisfies AgentRunnerWidgetKey;
export const approvalBatchWidget =
	"lucid-tool-approval-batch" satisfies AgentRunnerWidgetKey;
export const webSearchTool = "web_search" satisfies AgentLucidToolName;
export const webFetchTool = "web_fetch" satisfies AgentLucidToolName;
export const analyzeMediaTool = "media_analyze" satisfies AgentLucidToolName;
export const readFileTool = "media_read_file" satisfies AgentLucidToolName;
/** Document and request write tools link what they change to the chat, and open or change requests. */
export const writeTools: readonly string[] = [
	"documents_create",
	"documents_update",
	"documents_delete",
	"documents_unpublish",
	"requests_comment",
	"requests_reply",
	"requests_update_comment",
	"requests_acknowledge",
	"requests_update",
	"requests_complete",
	"requests_schedule",
] satisfies AgentLucidToolName[];

/**
 * Built-in widgets render only the versions this admin knows. Other versions
 * show their saved data and can only be cancelled. Plugin widgets handle their
 * own versions.
 */
export const isWidgetSupported = (
	widget: Pick<AgentWidgetPart, "key" | "version">,
) => !widget.key.startsWith("lucid-") || widget.version === 1;

/** Tool calls shown as rows in the chat and listed in its sidebar. */
export const isToolRow = (part: AgentMessagePart): part is AgentToolPart =>
	part.type === "tool" &&
	part.name !== askTool &&
	(part.name !== finishTool || part.status !== "complete") &&
	part.name !== progressTool;

/** The displayed tool status, including recovered failures shown as retried. */
export type AgentToolDisplayStatus = AgentToolPart["status"] | "retried";

export const toolDisplayStatus = (
	part: AgentToolPart,
	retried: boolean | undefined,
): AgentToolDisplayStatus =>
	part.status === "failed" && retried ? "retried" : part.status;

/** Identifies failed calls followed by a successful call to the same tool in the same run. */
export const retriedToolIds = (
	messages: AgentMessage[],
): ReadonlySet<string> => {
	const completed = new Set<string>();
	const retried = new Set<string>();
	for (const message of messages.toReversed()) {
		const run = message.runId ?? message.id;
		for (const part of message.parts.toReversed()) {
			if (!isToolRow(part)) continue;
			const key = `${run}:${part.name}`;
			if (part.status === "complete") completed.add(key);
			if (part.status === "failed" && completed.has(key)) retried.add(part.id);
		}
	}
	return retried;
};

export type AgentToolGroup = {
	calls: AgentToolPart[];
	latest: AgentToolPart;
	lastIndex: number;
};

/** Only a group's first part produces a row. Calls retain their transcript order. */
export const toolGroupAt = (
	parts: AgentMessagePart[],
	index: number,
): AgentToolGroup | undefined => {
	const first = parts[index];
	const previous = parts[index - 1];
	if (!first || !isToolRow(first) || (previous && isToolRow(previous))) {
		return undefined;
	}

	const calls = [first];
	let latest = first;
	let lastIndex = index;
	for (let next = index + 1; next < parts.length; next++) {
		const call = parts[next];
		if (!isToolRow(call)) break;
		calls.push(call);
		latest = call;
		lastIndex = next;
	}
	return { calls, latest, lastIndex };
};

/** A string field from a tool's output, such as its `error` or an analysis. */
export const toolOutputText = (output: unknown, field: string) => {
	if (!isObjectRecord(output)) return undefined;
	const value = output[field];
	return typeof value === "string" ? value : undefined;
};

export const webSiteName = (url: string) => {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
};

export const isWebSearchOutput = (
	value: unknown,
): value is AgentWebSearchOutput =>
	isObjectRecord(value) &&
	Array.isArray(value.results) &&
	value.results.every(
		(result) => isObjectRecord(result) && typeof result.url === "string",
	);

export const isWebFetchOutput = (
	value: unknown,
): value is AgentWebFetchOutput =>
	isObjectRecord(value) &&
	typeof value.url === "string" &&
	typeof value.content === "string";

export const isFileReadOutput = (
	value: unknown,
): value is AgentFileReadOutput =>
	isObjectRecord(value) &&
	typeof value.mediaId === "number" &&
	(value.mode === "read" || value.mode === "search") &&
	typeof value.totalChars === "number" &&
	typeof value.truncated === "boolean" &&
	Array.isArray(value.passages) &&
	value.passages.every(
		(passage) =>
			isObjectRecord(passage) &&
			typeof passage.offset === "number" &&
			typeof passage.text === "string",
	);
