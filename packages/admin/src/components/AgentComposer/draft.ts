import {
	type AgentReferenceItem,
	agentReferenceItem,
	mergeAgentReferences,
} from "@/utils/agent-references";

const draftPrefix = "lucid:agent-draft:";
type Draft = {
	text: string;
	references: AgentReferenceItem[];
};

/** Display details saved with a reference, when they are valid. */
const readDetails = (value: object) => ({
	...("label" in value && typeof value.label === "string"
		? { label: value.label }
		: {}),
	...("mimeType" in value && typeof value.mimeType === "string"
		? { mimeType: value.mimeType }
		: {}),
	...("previewUrl" in value && typeof value.previewUrl === "string"
		? { previewUrl: value.previewUrl }
		: {}),
});

const readReference = (value: unknown): AgentReferenceItem[] => {
	if (!value || typeof value !== "object" || !("type" in value)) return [];
	if (
		value.type === "media" &&
		"mediaId" in value &&
		typeof value.mediaId === "number"
	) {
		return [
			{
				...agentReferenceItem({ type: "media", mediaId: value.mediaId }),
				...readDetails(value),
			},
		];
	}

	if (
		value.type === "document" &&
		"collectionKey" in value &&
		typeof value.collectionKey === "string" &&
		"documentId" in value &&
		typeof value.documentId === "number"
	) {
		return [
			{
				...agentReferenceItem({
					type: "document",
					collectionKey: value.collectionKey,
					documentId: value.documentId,
					...("versionId" in value && typeof value.versionId === "number"
						? { versionId: value.versionId }
						: {}),
				}),
				...readDetails(value),
			},
		];
	}

	return [];
};

/** Restores a draft without trusting browser storage to contain valid references. */
export const readDraft = (key?: string): Draft => {
	const empty: Draft = { text: "", references: [] };
	if (!key) return empty;
	try {
		const stored = sessionStorage.getItem(draftPrefix + key);
		if (!stored) return empty;
		const value: unknown = JSON.parse(stored);
		if (
			!value ||
			typeof value !== "object" ||
			!("text" in value) ||
			typeof value.text !== "string"
		) {
			return empty;
		}

		return {
			text: value.text,
			references:
				"references" in value && Array.isArray(value.references)
					? value.references.flatMap(readReference)
					: [],
		};
	} catch {
		return empty;
	}
};

/** Saves the text and selected resources together for the browser session. */
export const writeDraft = (key: string | undefined, draft: Draft) => {
	if (!key) return;
	try {
		if (draft.text || draft.references.length) {
			sessionStorage.setItem(draftPrefix + key, JSON.stringify(draft));
		} else {
			sessionStorage.removeItem(draftPrefix + key);
		}
	} catch {}
};

/** Restores a rejected submission while keeping anything written after sending it. */
export const restoreSubmittedDraft = (
	submitted: Draft,
	current: Draft,
): Draft => ({
	text: [submitted.text, current.text].filter(Boolean).join("\n\n"),
	references: mergeAgentReferences(submitted.references, current.references),
});
