import { normalizePreviewToken } from "../utils/preview.js";
import { parseToolbarAuthentication } from "./authentication.js";
import { declarativeToolbarTagName } from "./constants.js";
import { setupToolbar } from "./loader.js";
import type {
	PreviewKind,
	ToolbarController,
	ToolbarEditLink,
	ToolbarOptions,
	ToolbarPreviewOptions,
} from "./types.js";

const attributes = {
	authStatus: "auth-status",
	host: "host",
	editCollection: "edit-collection",
	editDocumentId: "edit-document-id",
	editLabel: "edit-label",
	editStatus: "edit-status",
	editVersionId: "edit-version-id",
	preview: "preview",
	previewExitHref: "preview-exit-href",
	previewToken: "preview-token",
} as const;

const observedAttributes = Object.values(attributes);

const HTMLElementBase = (
	typeof HTMLElement === "undefined" ? class {} : HTMLElement
) as typeof HTMLElement;

type DeclarativePreviewState = PreviewKind | "published";

const readString = (
	element: HTMLElement,
	attribute: string,
): string | undefined => {
	const value = element.getAttribute(attribute)?.trim();
	return value || undefined;
};

const readInteger = (
	element: HTMLElement,
	attribute: string,
): number | undefined => {
	const value = readString(element, attribute);
	if (!value) return undefined;
	const parsed = Number(value);
	return Number.isInteger(parsed) ? parsed : undefined;
};

const readPreviewState = (
	element: HTMLElement,
): DeclarativePreviewState | null => {
	const value = readString(element, attributes.preview)?.toLowerCase();
	if (value === "exact" || value === "perspective" || value === "published") {
		return value;
	}
	return null;
};

const readEditOptions = (element: HTMLElement): ToolbarEditLink | undefined => {
	const collectionKey = readString(element, attributes.editCollection);
	const documentId = readInteger(element, attributes.editDocumentId);
	if (!collectionKey || documentId === undefined) return undefined;

	return {
		collectionKey,
		documentId,
		status: readString(element, attributes.editStatus),
		versionId: readInteger(element, attributes.editVersionId),
		label: readString(element, attributes.editLabel),
	};
};

const readPreviewOptions = (
	element: HTMLElement,
	previewToken: string | null,
): ToolbarOptions["preview"] => {
	const state = readPreviewState(element);
	if (state === "published") return false;

	const exitUrl = readString(element, attributes.previewExitHref);
	if (state === null && previewToken === null && !exitUrl) return undefined;

	const preview: ToolbarPreviewOptions = {};
	if (state) preview.mode = state;
	if (previewToken) preview.token = previewToken;
	if (exitUrl) preview.exitUrl = exitUrl;
	return preview;
};

const readToolbarOptions = (
	element: HTMLElement,
	previewToken: string | null,
): ToolbarOptions => ({
	authentication: parseToolbarAuthentication(
		element.getAttribute(attributes.authStatus),
	),
	host: readString(element, attributes.host),
	edit: readEditOptions(element),
	preview: readPreviewOptions(element, previewToken),
});

/** Declarative element for Lucid's isolated frontend toolbar. */
export class LucidToolbarElement extends HTMLElementBase {
	static observedAttributes = observedAttributes;
	static tagName = declarativeToolbarTagName;

	#controller: ToolbarController | null = null;
	#previewToken: string | null = null;
	#removingPreviewToken = false;
	#syncQueued = false;

	connectedCallback(): void {
		const previewToken = this.getAttribute(attributes.previewToken);
		if (previewToken !== null) this.#consumePreviewToken(previewToken);
		if (readPreviewState(this) === "published") this.#previewToken = null;
		this.#queueSync();
	}

	disconnectedCallback(): void {
		this.#controller?.cleanup();
		this.#controller = null;
	}

	attributeChangedCallback(
		name: string,
		oldValue: string | null,
		newValue: string | null,
	): void {
		if (oldValue === newValue) return;

		if (name === attributes.previewToken) {
			if (this.#removingPreviewToken) return;
			if (newValue === null) {
				this.#previewToken = null;
			} else {
				this.#consumePreviewToken(newValue);
			}
		}

		if (name === attributes.preview) {
			const state = readPreviewState(this);
			if (state === null || state === "published") {
				this.#previewToken = null;
			}
		}

		if (this.isConnected) this.#queueSync();
	}

	#consumePreviewToken(value: string): void {
		this.#previewToken =
			readPreviewState(this) === "published"
				? null
				: normalizePreviewToken(value);
		this.#removingPreviewToken = true;
		this.removeAttribute(attributes.previewToken);
		this.#removingPreviewToken = false;
	}

	#queueSync(): void {
		if (this.#syncQueued) return;
		const targetWindow = this.ownerDocument.defaultView;
		if (!targetWindow) return;

		this.#syncQueued = true;
		targetWindow.queueMicrotask(() => {
			this.#syncQueued = false;
			if (!this.isConnected) return;
			this.#controller?.cleanup();
			this.#controller = setupToolbar(
				readToolbarOptions(this, this.#previewToken),
			);
		});
	}
}
