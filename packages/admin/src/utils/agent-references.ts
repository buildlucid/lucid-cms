import type {
	Agent,
	AgentCapabilities,
	AgentReferenceInput,
	AgentReferenceSnapshot,
	Media,
} from "@types";
import T from "@/translations";

/** A reference shown in chat, with a preview when one is known. */
export type AgentReferenceItem = AgentReferenceSnapshot & {
	previewUrl?: string;
};

export type AgentUpload = {
	id: string;
	name: string;
	/** Percent uploaded, from 0 to 100. */
	progress: number;
	error?: string;
};

export type AgentReferenceKind =
	| "document"
	| "image"
	| "pdf"
	| "audio"
	| "video"
	| "text"
	| "file";

/** Identifies a linked resource, including a pinned document version. */
export const agentReferenceKey = (reference: AgentReferenceInput) =>
	reference.type === "media"
		? `media:${reference.mediaId}`
		: `document:${reference.collectionKey}:${reference.documentId}:${reference.versionId ?? "latest"}`;

/** The identity the server expects, without display details. */
export const agentReferenceInput = (
	reference: AgentReferenceInput,
): AgentReferenceInput =>
	reference.type === "media"
		? { type: "media", mediaId: reference.mediaId }
		: {
				type: "document",
				collectionKey: reference.collectionKey,
				documentId: reference.documentId,
				...(reference.versionId === undefined
					? {}
					: { versionId: reference.versionId }),
			};

/** Fills in display details for a bare reference from known items, falling back to its type and ID. */
export const agentReferenceItem = (
	reference: AgentReferenceInput | AgentReferenceItem,
	known?: Readonly<Record<string, AgentReferenceItem>>,
): AgentReferenceItem => {
	if ("label" in reference) return reference;
	return (
		known?.[agentReferenceKey(reference)] ?? {
			...reference,
			label:
				reference.type === "media"
					? `${T()("common.media")} #${reference.mediaId}`
					: `${reference.collectionKey} #${reference.documentId}`,
		}
	);
};

/** Combines selections without duplicating the same resource and version. */
export const mergeAgentReferences = <Reference extends AgentReferenceInput>(
	current: Reference[],
	added: Reference[],
) => [
	...new Map(
		[...current, ...added].map((reference) => [
			agentReferenceKey(reference),
			reference,
		]),
	).values(),
];

/** Keeps pinned versions when a resource selector confirms an existing document. */
export const preserveSelectedDocumentVersions = <
	Reference extends AgentReferenceInput,
>(
	current: Reference[],
	selected: Reference[],
) =>
	mergeAgentReferences(
		[],
		selected.flatMap((document) => {
			if (document.type !== "document") return [];
			const existing = current.filter(
				(reference) =>
					reference.type === "document" &&
					reference.collectionKey === document.collectionKey &&
					reference.documentId === document.documentId,
			);
			return existing.length ? existing : [document];
		}),
	);

const matchesMimeType = (mimeType: string, patterns: readonly string[]) =>
	patterns.some(
		(pattern) =>
			pattern === mimeType ||
			(pattern.endsWith("/*") && mimeType.startsWith(pattern.slice(0, -1))),
	);

export const readableMimeTypes = (capabilities: AgentCapabilities) => [
	...new Set([
		...(capabilities.mediaAnalysis?.mimeTypes ?? []),
		...(capabilities.fileRead?.mimeTypes ?? []),
	]),
];

/** Whether a tool can open this attachment. CMS documents are read through content tools. */
export const canAgentOpen = (
	reference: AgentReferenceSnapshot,
	capabilities: AgentCapabilities,
) => {
	if (reference.type === "document") return undefined;
	return (
		reference.mimeType !== undefined &&
		matchesMimeType(reference.mimeType, readableMimeTypes(capabilities))
	);
};

/**
 * Whether media can be attached to a message, matching the server's check.
 * Personal files need uploads or attachments, library media needs attachments
 * and permission to read the library, and system media is never attachable.
 */
export const canAttachMedia = (
	media: Pick<Media, "ownership">,
	props: { features: Agent["features"]; canReadLibrary: boolean },
) => {
	switch (media.ownership.type) {
		case "user":
			return props.features.media.upload || props.features.media.attach;
		case "library":
			return props.features.media.attach && props.canReadLibrary;
		case "system":
			return false;
	}
};

/** A coarse file kind, for choosing an icon when there is no preview. */
export const agentReferenceKind = (
	reference: Pick<AgentReferenceSnapshot, "type" | "mimeType">,
): AgentReferenceKind => {
	if (reference.type === "document") return "document";
	const mimeType = reference.mimeType ?? "";
	if (mimeType === "application/pdf") return "pdf";
	if (mimeType.startsWith("image/")) return "image";
	if (mimeType.startsWith("audio/")) return "audio";
	if (mimeType.startsWith("video/")) return "video";
	if (
		mimeType.startsWith("text/") ||
		mimeType === "application/json" ||
		mimeType === "application/yaml" ||
		mimeType === "application/xml" ||
		mimeType === "application/x-subrip"
	) {
		return "text";
	}
	return "file";
};

/** Names the kinds of media an agent can open as a list in the interface language, eg. "images, PDFs and audio". */
export const describeReadableMedia = (mimeTypes: readonly string[]) =>
	new Intl.ListFormat(document.documentElement.lang || undefined, {
		type: "conjunction",
	}).format(
		[
			...new Set(
				mimeTypes.map((mimeType) =>
					agentReferenceKind({ type: "media", mimeType }),
				),
			),
		].map((kind) => T()(`agent.references.kinds.${kind}`)),
	);

const tilts = [-3, 2, -1.5, 3.5, -2.5, 1];

/** A small tilt that stays the same for a reference, so files look laid out by hand without moving between renders. */
export const agentReferenceTilt = (reference: AgentReferenceInput) => {
	let hash = 0;
	for (const character of agentReferenceKey(reference)) {
		hash = (hash * 31 + character.charCodeAt(0)) | 0;
	}

	return tilts[Math.abs(hash) % tilts.length] ?? 0;
};
