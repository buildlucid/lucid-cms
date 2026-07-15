import type {
	CollectionDocument,
	DocumentVersionType,
	PreviewSession,
} from "@lucidcms/types";

type DataResponse<TData> = {
	data?: TData;
};

type AuthenticationState = {
	authenticated: boolean;
};

type AuthenticationStatus = "authenticated" | "unauthenticated" | "unknown";

type DocumentState = Pick<
	CollectionDocument,
	"collectionKey" | "id" | "status"
> & {
	meta?: Pick<NonNullable<CollectionDocument["meta"]>, "versionId">;
};

type PreviewState = {
	active: boolean;
	token: string | null;
	preview: Pick<PreviewSession, "mode"> | null;
};

type ResolveToolbarAttributesInput = {
	authentication: DataResponse<AuthenticationState>;
	document: DataResponse<DocumentState>;
	preview: DataResponse<PreviewState>;
	/** Public host of the Lucid instance when it differs from the site origin. */
	host?: string | URL;
};

type ToolbarAttributes = {
	"auth-status": AuthenticationStatus;
	host?: string;
	"edit-collection"?: string;
	"edit-document-id"?: number;
	"edit-status"?: DocumentVersionType;
	"edit-version-id"?: number;
	preview: PreviewSession["mode"] | "published";
	"preview-token"?: string;
};

const resolveAuthenticationStatus = (
	response: DataResponse<AuthenticationState>,
): AuthenticationStatus => {
	if (!response.data) return "unknown";
	return response.data.authenticated ? "authenticated" : "unauthenticated";
};

/** Resolves server responses into declarative toolbar element attributes. */
export const resolveToolbarAttributes = ({
	authentication,
	document,
	preview,
	host,
}: ResolveToolbarAttributesInput): ToolbarAttributes | null => {
	const authenticationStatus = resolveAuthenticationStatus(authentication);
	const previewState = preview.data;
	const activePreview =
		previewState?.active && previewState.token && previewState.preview
			? {
					mode: previewState.preview.mode,
					token: previewState.token,
				}
			: null;
	const editableDocument = document.data;
	const editVersionId = editableDocument?.meta?.versionId;

	if (!activePreview && !editableDocument) return null;
	if (!activePreview && authenticationStatus === "unauthenticated") {
		return null;
	}

	return {
		"auth-status": authenticationStatus,
		...(host === undefined ? {} : { host: String(host) }),
		...(editableDocument
			? {
					"edit-collection": editableDocument.collectionKey,
					"edit-document-id": editableDocument.id,
					...(editableDocument.status
						? { "edit-status": editableDocument.status }
						: {}),
					...(typeof editVersionId === "number" &&
					Number.isInteger(editVersionId)
						? { "edit-version-id": editVersionId }
						: {}),
				}
			: {}),
		preview: activePreview?.mode ?? "published",
		...(activePreview ? { "preview-token": activePreview.token } : {}),
	};
};
