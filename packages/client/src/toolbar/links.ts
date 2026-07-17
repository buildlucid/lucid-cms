import { getToolbarAdminHref } from "./host.js";
import type { ToolbarEditLink } from "./types.js";

/** Builds the Lucid admin URL for an editable document version. */
export const buildToolbarEditHref = (
	edit: ToolbarEditLink,
	host?: string | URL,
): string | null => {
	if (!edit.collectionKey || !Number.isInteger(edit.documentId)) return null;

	const adminHref = getToolbarAdminHref(host);
	const collectionKey = encodeURIComponent(edit.collectionKey);
	if (edit.version === "revision") {
		if (!Number.isInteger(edit.versionId)) return null;
		return `${adminHref}/collections/${collectionKey}/revision/${edit.documentId}/${edit.versionId}`;
	}

	const version = encodeURIComponent(edit.version ?? "latest");
	return `${adminHref}/collections/${collectionKey}/${version}/${edit.documentId}`;
};
