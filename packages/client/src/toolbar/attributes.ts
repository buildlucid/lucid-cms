import type {
	DocumentVersionType,
	PreviewMode,
	PreviewRuntimeState,
} from "@lucidcms/types";
import type { ToolbarDocument, ToolbarPreviewNavigation } from "./types.js";

export type ToolbarAttributes = {
	"auth-status": "auto" | "authenticated" | "unauthenticated";
	host?: string;
	"edit-collection"?: string;
	"edit-document-id"?: number;
	"edit-version"?: DocumentVersionType;
	"edit-version-id"?: number;
	"edit-label"?: string;
	preview: "auto" | "published" | PreviewMode;
	"preview-token"?: string;
	"preview-expires-at"?: string;
	"preview-exit-href"?: string;
};

export type ToolbarAttributeOptions = {
	/** Public host of the Lucid instance when it differs from the site origin. */
	host?: string | URL;
	document?: ToolbarDocument | null;
	editLabel?: string;
	authentication?: "auto" | boolean;
	preview?: "auto" | PreviewRuntimeState;
	previewNavigation?: Pick<ToolbarPreviewNavigation, "exitUrl">;
};

const authenticationAttribute = (
	authentication: ToolbarAttributeOptions["authentication"],
): ToolbarAttributes["auth-status"] => {
	if (authentication === true) return "authenticated";
	if (authentication === false) return "unauthenticated";
	return "auto";
};

/** Serializes generic toolbar configuration for `<lucid-toolbar>`. */
export const createToolbarAttributes = ({
	host,
	document = null,
	editLabel,
	authentication = "auto",
	preview = "auto",
	previewNavigation,
}: ToolbarAttributeOptions = {}): ToolbarAttributes | null => {
	if (
		preview !== "auto" &&
		preview.kind === "published" &&
		(!document || authentication === false)
	) {
		return null;
	}

	const versionId = document?.meta?.versionId;
	return {
		"auth-status": authenticationAttribute(authentication),
		...(host === undefined ? {} : { host: String(host) }),
		...(document
			? {
					"edit-collection": document.collectionKey,
					"edit-document-id": document.id,
					...(document.version === null
						? {}
						: { "edit-version": document.version }),
					...(typeof versionId === "number" && Number.isInteger(versionId)
						? { "edit-version-id": versionId }
						: {}),
					...(editLabel?.trim() ? { "edit-label": editLabel.trim() } : {}),
				}
			: {}),
		preview:
			preview === "auto"
				? "auto"
				: preview.kind === "published"
					? "published"
					: preview.mode,
		...(preview !== "auto" && preview.kind === "preview"
			? {
					"preview-token": preview.token,
					"preview-expires-at": preview.expiresAt,
				}
			: {}),
		...(previewNavigation?.exitUrl === undefined
			? {}
			: { "preview-exit-href": String(previewNavigation.exitUrl) }),
	};
};
