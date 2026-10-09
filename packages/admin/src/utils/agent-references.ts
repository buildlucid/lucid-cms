import type {
	Agent,
	AgentCapabilities,
	AgentReferenceInput,
	AgentReferenceSnapshot,
	Media,
} from "@types";
import T from "@/translations";
import mediaUrl from "@/utils/media-url";
import { getTranslation } from "@/utils/translation-helpers";

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
	| "request"
	| "image"
	| "pdf"
	| "audio"
	| "video"
	| "text"
	| "file";

/** Identifies a linked resource, including a pinned document version. */
export const agentReferenceKey = (reference: AgentReferenceInput) => {
	switch (reference.type) {
		case "media":
			return `media:${reference.mediaId}`;
		case "document":
			return `document:${reference.collectionKey}:${reference.documentId}:${reference.versionId ?? "latest"}`;
		case "request":
			return `request:${reference.requestId}`;
	}
};

/** The identity the server expects, without display details. */
export const agentReferenceInput = (
	reference: AgentReferenceInput,
): AgentReferenceInput => {
	switch (reference.type) {
		case "media":
			return { type: "media", mediaId: reference.mediaId };
		case "document":
			return {
				type: "document",
				collectionKey: reference.collectionKey,
				documentId: reference.documentId,
				...(reference.versionId === undefined
					? {}
					: { versionId: reference.versionId }),
			};
		case "request":
			return { type: "request", requestId: reference.requestId };
	}
};

const fallbackLabel = (reference: AgentReferenceInput) => {
	switch (reference.type) {
		case "media":
			return `${T()("common.media")} #${reference.mediaId}`;
		case "document":
			return `${reference.collectionKey} #${reference.documentId}`;
		case "request":
			return `${T()("common.request")} #${reference.requestId}`;
	}
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
			label: fallbackLabel(reference),
		}
	);
};

/** An image's thumbnail, or a video's poster, falling back to its delivery thumbnail. */
const mediaPreviewUrl = (media: Media) => {
	if (media.type === "image") {
		return media.url ? mediaUrl(media, "thumbnail-small") : undefined;
	}
	if (media.type !== "video") return undefined;
	if (media.poster?.url) return mediaUrl(media.poster, "thumbnail-small");
	return media.thumbnail?.url || undefined;
};

/** Builds display details for a media reference, defaulting its label to the title in `contentLocale` and then the file name. */
export const mediaReferenceItem = (
	media: Media,
	options: { label?: string; contentLocale?: string | null } = {},
): AgentReferenceItem => {
	const previewUrl = mediaPreviewUrl(media);
	return {
		type: "media",
		mediaId: media.id,
		label:
			options.label ||
			getTranslation(media.title, options.contentLocale) ||
			media.fileName ||
			fallbackLabel({ type: "media", mediaId: media.id }),
		mimeType: media.meta.mimeType,
		...(previewUrl ? { previewUrl } : {}),
	};
};

/** Builds selected media references from newly loaded details, falling back to existing selections and then bare IDs. */
export const selectedMediaItems = (
	current: AgentReferenceItem[],
	selection: { value: number[]; refs: Media[] },
	contentLocale?: string | null,
): AgentReferenceItem[] =>
	selection.value.map((mediaId) => {
		const media = selection.refs.find((ref) => ref.id === mediaId);
		if (media) return mediaReferenceItem(media, { contentLocale });

		return (
			current.find(
				(reference) =>
					reference.type === "media" && reference.mediaId === mediaId,
			) ?? agentReferenceItem({ type: "media", mediaId })
		);
	});

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

/** Checks whether the agent can open a media attachment with its configured capabilities. */
export const canAgentOpen = (
	reference: AgentReferenceSnapshot,
	capabilities: AgentCapabilities,
) => {
	if (reference.type !== "media") return undefined;
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
	if (reference.type !== "media") return reference.type;
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
