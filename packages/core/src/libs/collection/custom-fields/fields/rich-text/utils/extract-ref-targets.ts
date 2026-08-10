import { type RichTextJSON, richTextNodeNames } from "@lucidcms/rich-text";
import buildTableName from "../../../../helpers/build-table-name.js";
import type { CustomFieldRefTargets, FieldRefTarget } from "../../../types.js";

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
	targets: Map<string, FieldRefTarget>,
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
		table: tableNameRes.data.name,
		value: documentId,
	});
};

const addMediaTarget = (
	targets: Map<number, FieldRefTarget>,
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
		table: "lucid_media",
		value: mediaId,
	});
};

/** Extracts media and document targets embedded in rich-text JSON. */
const extractRichTextRefTargets = (value: unknown): CustomFieldRefTargets => {
	const json = asRichTextJSON(value);
	if (!json) return {};

	const mediaTargets = new Map<number, FieldRefTarget>();
	const documentTargets = new Map<string, FieldRefTarget>();

	const visit = (node: RichTextJSON) => {
		if (node.type === richTextNodeNames.media) {
			addMediaTarget(mediaTargets, node.attrs);
		}

		if (node.type === richTextNodeNames.variable) {
			addDocumentTarget(documentTargets, node.attrs);
		}

		for (const mark of node.marks ?? []) {
			if (mark.type === "link" && mark.attrs?.kind === "document") {
				addDocumentTarget(documentTargets, mark.attrs);
			}
		}

		for (const child of node.content ?? []) visit(child);
	};

	visit(json);
	return {
		media: Array.from(mediaTargets.values()),
		relation: Array.from(documentTargets.values()),
	};
};

export default extractRichTextRefTargets;
