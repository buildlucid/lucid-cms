import { getToolbarAdminHref } from "./host.js";
import type { ToolbarDocument } from "./types.js";

/** Builds the Lucid admin URL for an editable document version. */
export const buildToolbarEditHref = (
	document: ToolbarDocument,
	host?: string | URL,
): string | null => {
	if (!document.collectionKey || !Number.isInteger(document.id)) return null;

	const adminHref = getToolbarAdminHref(host);
	const collectionKey = encodeURIComponent(document.collectionKey);
	if (document.version === "revision") {
		const versionId = document.meta?.versionId;
		if (!Number.isInteger(versionId)) return null;
		return `${adminHref}/collections/${collectionKey}/revision/${document.id}/${versionId}`;
	}

	const version = encodeURIComponent(document.version ?? "latest");
	return `${adminHref}/collections/${collectionKey}/${version}/${document.id}`;
};
