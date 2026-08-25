import {
	extractRichTextReferences,
	type RichTextJSON,
} from "@lucidcms/rich-text";
import type { RefTarget } from "../../../../../refs/types.js";
import buildTableName from "../../../../helpers/build-table-name.js";

const asRichTextJSON = (value: unknown): RichTextJSON | null => {
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value) as unknown;
			return parsed && typeof parsed === "object"
				? (parsed as RichTextJSON)
				: null;
		} catch {
			return null;
		}
	}
	return value && typeof value === "object" ? (value as RichTextJSON) : null;
};

const addDocumentTarget = (
	targets: Map<string, RefTarget>,
	attrs?: Record<string, unknown>,
) => {
	const documentId = attrs?.documentId;
	if (
		typeof attrs?.collectionKey !== "string" ||
		typeof documentId !== "number" ||
		!Number.isInteger(documentId) ||
		documentId <= 0
	) {
		return;
	}

	const tableNameRes = buildTableName(
		"document",
		{ collection: attrs.collectionKey },
		null,
	);
	if (tableNameRes.error) return;

	targets.set(`${tableNameRes.data.name}:${documentId}`, {
		resource: "documents",
		table: tableNameRes.data.name,
		value: documentId,
	});
};

const addMediaTarget = (
	targets: Map<number, RefTarget>,
	attrs?: Record<string, unknown>,
) => {
	const mediaId = attrs?.mediaId;
	if (
		typeof mediaId !== "number" ||
		!Number.isInteger(mediaId) ||
		mediaId <= 0
	) {
		return;
	}

	targets.set(mediaId, {
		resource: "media",
		table: "lucid_media",
		value: mediaId,
	});
};

const addUserTarget = (
	targets: Map<number, RefTarget>,
	attrs?: Record<string, unknown>,
) => {
	const userId = attrs?.userId;
	if (typeof userId !== "number" || !Number.isInteger(userId) || userId <= 0) {
		return;
	}

	targets.set(userId, {
		resource: "users",
		table: "lucid_users",
		value: userId,
	});
};

/** Extracts resource targets embedded in rich-text JSON. */
const extractRichTextRefTargets = (value: unknown): RefTarget[] => {
	const json = asRichTextJSON(value);
	if (!json) return [];

	const mediaTargets = new Map<number, RefTarget>();
	const documentTargets = new Map<string, RefTarget>();
	const userTargets = new Map<number, RefTarget>();

	for (const reference of extractRichTextReferences(json)) {
		if (reference.type === "rich-text-media") {
			addMediaTarget(mediaTargets, { mediaId: reference.mediaId });
		}
		if (
			reference.type === "rich-text-document" ||
			(reference.type === "rich-text-variable" &&
				reference.source === "document") ||
			reference.type === "rich-text-document-link"
		) {
			addDocumentTarget(documentTargets, {
				collectionKey: reference.collectionKey,
				documentId: reference.documentId,
			});
		}
		if (
			reference.type === "rich-text-variable" &&
			reference.source === "user"
		) {
			addUserTarget(userTargets, { userId: reference.userId });
		}
	}
	return [
		...mediaTargets.values(),
		...documentTargets.values(),
		...userTargets.values(),
	];
};

export default extractRichTextRefTargets;
