import type {
	AgentFileReadOutput,
	AgentLucidToolName,
	AgentMessagePart,
	AgentRunnerToolName,
	AgentRunnerWidgetKey,
	AgentWebFetchOutput,
	AgentWebSearchOutput,
} from "@types";
import helpers from "@/utils/helpers";
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

/** Tool calls shown as rows in the chat and listed in its sidebar. */
export const isToolRow = (part: AgentMessagePart): part is AgentToolPart =>
	part.type === "tool" &&
	part.name !== askTool &&
	(part.name !== finishTool || part.status !== "complete") &&
	part.name !== progressTool;

export const toolTitle = (part: Pick<AgentToolPart, "name" | "title">) =>
	helpers.getLocaleValue({
		value: part.title,
		fallback: part.name.replaceAll("_", " "),
	});

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
