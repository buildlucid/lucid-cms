import type {
	AgentAudioSettings,
	AgentBuilderChangesData,
	AgentCoreWidgetKey,
	AgentFileReadOutput,
	AgentImageSettingsData,
	AgentLucidToolName,
	AgentMediaSelectData,
	AgentReferencesData,
	AgentRunnerToolName,
	AgentScreenCall,
	AgentWebReadOutput,
	AgentWebSearchOutput,
} from "@lucidcms/types";
import type { AgentMessage, AgentMessagePart, AgentWidgetPart } from "@types";
import T, { translateAdminCopy } from "@/translations";
import { isObjectRecord } from "@/utils/type-guards";

export type AgentToolPart = Extract<AgentMessagePart, { type: "tool" }>;

//* typed against the server's names, so a rename there fails to compile here
export const previewMediaWidget =
	"lucid-media-preview" satisfies AgentCoreWidgetKey;
export const askTool = "lucid_ask_user" satisfies AgentRunnerToolName;
export const finishTool = "lucid_finish_run" satisfies AgentRunnerToolName;
export const progressTool =
	"lucid_share_progress" satisfies AgentRunnerToolName;
export const questionWidget = "lucid-question" satisfies AgentCoreWidgetKey;
export const confirmationWidget =
	"lucid-tool-confirmation" satisfies AgentCoreWidgetKey;
export const confirmationBatchWidget =
	"lucid-tool-confirmation-batch" satisfies AgentCoreWidgetKey;
export const mediaSelectWidget =
	"lucid-media-select" satisfies AgentCoreWidgetKey;
/** Asks this tab's open screen to answer a builder tool. The session answers it, so it never shows. */
export const screenWidget = "lucid-screen" satisfies AgentCoreWidgetKey;
/** Stores builder updates shown together at the end of a reply. */
export const builderChangesWidget =
	"lucid-builder-changes" satisfies AgentCoreWidgetKey;
/** Lists the references a tool call linked, where it linked them. */
export const referencesWidget = "lucid-references" satisfies AgentCoreWidgetKey;
export const webSearchTool = "web_search" satisfies AgentLucidToolName;
export const webReadTool = "web_read" satisfies AgentLucidToolName;
export const analyzeMediaTool = "media_analyze" satisfies AgentLucidToolName;
export const readFileTool = "media_read_file" satisfies AgentLucidToolName;
export const generateImageTool =
	"media_generate_image" satisfies AgentLucidToolName;
export const editImageTool = "media_edit_image" satisfies AgentLucidToolName;
/** Image tools shown as placeholders while running. */
export const imageTools: ReadonlySet<string> = new Set([
	generateImageTool,
	editImageTool,
]);
export const imageSettingsWidget =
	"lucid-image-settings" satisfies AgentCoreWidgetKey;
export const generateAudioTool =
	"media_generate_audio" satisfies AgentLucidToolName;
export const audioSettingsWidget =
	"lucid-audio-settings" satisfies AgentCoreWidgetKey;
/** Settings widgets that determine where a running media tool shows its placeholder. */
export const mediaSettingsWidgets: ReadonlySet<string> = new Set([
	imageSettingsWidget,
	audioSettingsWidget,
]);
/** Tools that change chat references without a references widget: previews show their media in a gallery instead, and removals show nothing. */
export const referenceTools: ReadonlySet<string> = new Set([
	"lucid_preview_media",
	"lucid_remove_reference",
] satisfies AgentRunnerToolName[]);

/**
 * Built-in widgets render only the versions this admin knows. Other versions
 * show their saved data and can only be cancelled. Plugin widgets handle their
 * own versions.
 */
export const isWidgetSupported = (
	widget: Pick<AgentWidgetPart, "key" | "version">,
) => !widget.key.startsWith("lucid-") || widget.version === 1;

/** The media type shown as a placeholder while a tool runs. */
export const generatingMediaType = (part: AgentToolPart) => {
	if (part.status !== "running") return undefined;
	if (imageTools.has(part.name)) return "image";
	return part.name === generateAudioTool ? "audio" : undefined;
};

/** Tool calls shown as rows in the chat and listed in its sidebar. */
export const isToolRow = (part: AgentMessagePart): part is AgentToolPart =>
	part.type === "tool" &&
	part.name !== askTool &&
	(part.name !== finishTool || part.status !== "complete") &&
	part.name !== progressTool;

/** Returns the width over height for aspect ratios such as "16:9", defaulting to 1 for `auto` or unknown ratios. */
export const imageAspectRatio = (input: unknown) => {
	const value = isObjectRecord(input) ? input.aspectRatio : undefined;
	const match =
		typeof value === "string" ? /^([\d.]+):([\d.]+)$/.exec(value) : null;
	return match ? Number(match[1]) / Number(match[2]) : 1;
};

/** The displayed tool status, including recovered failures shown as retried. */
export type AgentToolDisplayStatus = AgentToolPart["status"] | "retried";

export const toolDisplayStatus = (
	part: AgentToolPart,
	retried: boolean | undefined,
): AgentToolDisplayStatus =>
	part.status === "failed" && retried ? "retried" : part.status;

/**
 * Keys messages by run ID or by reply when no run is recorded.
 * @remarks Messages without run IDs, such as branch copies, share the first reply message ID after each user message.
 */
export const replyKeys = (messages: AgentMessage[]) => {
	const keys = new Map<string, string>();
	let first: string | undefined;
	for (const message of messages) {
		first = message.role === "user" ? undefined : (first ?? message.id);
		keys.set(message.id, message.runId ?? first ?? message.id);
	}
	return keys;
};

/** Identifies failed calls followed by a successful call to the same tool in the same reply. */
export const retriedToolIds = (
	messages: AgentMessage[],
): ReadonlySet<string> => {
	const completed = new Set<string>();
	const retried = new Set<string>();
	const replies = replyKeys(messages);
	for (const message of messages.toReversed()) {
		const run = replies.get(message.id) ?? message.id;
		for (const part of message.parts.toReversed()) {
			if (!isToolRow(part)) continue;
			const key = `${run}:${part.name}`;
			if (part.status === "complete") completed.add(key);
			if (part.status === "failed" && completed.has(key)) retried.add(part.id);
		}
	}
	return retried;
};

/** Consecutive parts of one kind, shown as a single row. */
export type AgentPartGroup<Part extends AgentMessagePart> = {
	parts: Part[];
	latest: Part;
	lastIndex: number;
};

export type AgentToolGroup = AgentPartGroup<AgentToolPart>;

/** Returns a consecutive `belongs` group in transcript order only at its first index. */
export const partGroupAt = <Part extends AgentMessagePart>(
	parts: AgentMessagePart[],
	index: number,
	belongs: (part: AgentMessagePart) => part is Part,
): AgentPartGroup<Part> | undefined => {
	const first = parts[index];
	const previous = parts[index - 1];
	if (!first || !belongs(first) || (previous && belongs(previous))) {
		return undefined;
	}

	const group = [first];
	let latest = first;
	let lastIndex = index;
	for (let next = index + 1; next < parts.length; next++) {
		const part = parts[next];
		if (!part || !belongs(part)) break;
		group.push(part);
		latest = part;
		lastIndex = next;
	}
	return { parts: group, latest, lastIndex };
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

export const isWebReadOutput = (value: unknown): value is AgentWebReadOutput =>
	isObjectRecord(value) &&
	typeof value.url === "string" &&
	typeof value.content === "string";

export const isMediaSelectData = (
	value: unknown,
): value is AgentMediaSelectData =>
	isObjectRecord(value) &&
	(value.types === null ||
		(Array.isArray(value.types) &&
			value.types.every((type) => typeof type === "string"))) &&
	typeof value.max === "number" &&
	typeof value.agentKey === "string" &&
	typeof value.includePersonal === "boolean" &&
	typeof value.upload === "boolean";

const isNullableString = (value: unknown) =>
	value === null || typeof value === "string";

export const isImageSettingsData = (
	value: unknown,
): value is AgentImageSettingsData =>
	isObjectRecord(value) &&
	typeof value.instruction === "string" &&
	typeof value.title === "string" &&
	isNullableString(value.alt) &&
	isNullableString(value.guidance) &&
	typeof value.aspectRatio === "string" &&
	isNullableString(value.resolution) &&
	isNullableString(value.quality) &&
	isNullableString(value.outputFormat) &&
	isNullableString(value.model) &&
	(value.editMediaId === null || typeof value.editMediaId === "number");

export const isAudioSettingsData = (
	value: unknown,
): value is AgentAudioSettings =>
	isObjectRecord(value) &&
	typeof value.script === "string" &&
	typeof value.title === "string" &&
	isNullableString(value.instruction) &&
	isNullableString(value.model) &&
	isNullableString(value.voice);

/** Screen calls come from the server, so only the parts the session routes on are checked. */
export const isScreenCallData = (value: unknown): value is AgentScreenCall =>
	isObjectRecord(value) &&
	isObjectRecord(value.screen) &&
	typeof value.screen.tabId === "string" &&
	(value.action === "read" ||
		value.action === "update" ||
		value.action === "focus");

/** Builder changes come from the server, so only the parts the card reads are checked. */
export const isBuilderChangesData = (
	value: unknown,
): value is AgentBuilderChangesData =>
	isObjectRecord(value) &&
	isObjectRecord(value.document) &&
	typeof value.document.collectionKey === "string" &&
	Array.isArray(value.changes);

/** References widgets come from the server, so only the identities the card reads are checked. */
export const isReferencesData = (
	value: unknown,
): value is AgentReferencesData =>
	isObjectRecord(value) &&
	Array.isArray(value.references) &&
	value.references.every(
		(reference) =>
			isObjectRecord(reference) &&
			(reference.type === "media"
				? typeof reference.mediaId === "number"
				: reference.type === "request"
					? typeof reference.requestId === "number"
					: reference.type === "document" &&
						typeof reference.collectionKey === "string" &&
						typeof reference.documentId === "number"),
	);

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

/** The tool's saved result copy, with a state label when the call did not complete. */
export const toolLabel = (part: AgentToolPart, retried?: boolean) => {
	const summary = translateAdminCopy(part.summary);
	const status = toolDisplayStatus(part, retried);
	return status === "complete"
		? summary
		: `${summary} · ${T()(`agent.tool.status.${status}`)}`;
};
