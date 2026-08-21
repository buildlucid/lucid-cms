import type { PreviewMode, PreviewRuntimeState } from "@lucidcms/types";
import { normalizePreviewToken } from "../utils/preview.js";
import { parseToolbarAuthentication } from "./authentication.js";
import { declarativeToolbarTagName } from "./constants.js";
import { setupToolbar } from "./loader.js";
import type {
	ToolbarController,
	ToolbarDocument,
	ToolbarOptions,
	ToolbarUpdate,
} from "./types.js";

const attributes = {
	authStatus: "auth-status",
	host: "host",
	editCollection: "edit-collection",
	editDocumentId: "edit-document-id",
	editLabel: "edit-label",
	editVersion: "edit-version",
	editVersionId: "edit-version-id",
	preview: "preview",
	previewExitHref: "preview-exit-href",
	previewExpiresAt: "preview-expires-at",
	previewToken: "preview-token",
} as const;

const observedAttributes = Object.values(attributes);
const setupAttributes = new Set<string>([
	attributes.authStatus,
	attributes.host,
	attributes.previewExitHref,
]);

const HTMLElementBase = (
	typeof HTMLElement === "undefined" ? class {} : HTMLElement
) as typeof HTMLElement;

type DeclarativePreviewState = "auto" | "published" | PreviewMode;

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

const readPreviewState = (element: HTMLElement): DeclarativePreviewState => {
	const value = readString(element, attributes.preview)?.toLowerCase();
	if (value === "scoped" || value === "perspective" || value === "published") {
		return value;
	}
	return "auto";
};

const readDocument = (element: HTMLElement): ToolbarDocument | null => {
	const collectionKey = readString(element, attributes.editCollection);
	const id = readInteger(element, attributes.editDocumentId);
	if (!collectionKey || id === undefined) return null;

	const versionId = readInteger(element, attributes.editVersionId);
	return {
		collectionKey,
		id,
		version: readString(element, attributes.editVersion) ?? "latest",
		...(versionId === undefined ? {} : { meta: { versionId } }),
	};
};

const readPreview = (
	element: HTMLElement,
	previewToken: string | null,
): ToolbarOptions["preview"] => {
	const state = readPreviewState(element);
	if (state === "published") return { kind: "published" };
	if (state === "auto") return "auto";

	const expiresAt = readString(element, attributes.previewExpiresAt);
	if (
		!previewToken ||
		!expiresAt ||
		!Number.isFinite(new Date(expiresAt).getTime())
	) {
		return "auto";
	}

	return {
		kind: "preview",
		mode: state,
		token: previewToken,
		expiresAt,
	} satisfies PreviewRuntimeState;
};

const readUpdate = (
	element: HTMLElement,
	previewToken: string | null,
): ToolbarUpdate => ({
	document: readDocument(element),
	editLabel: readString(element, attributes.editLabel),
	preview: readPreview(element, previewToken),
});

const readToolbarOptions = (
	element: HTMLElement,
	previewToken: string | null,
): ToolbarOptions => ({
	authentication: parseToolbarAuthentication(
		element.getAttribute(attributes.authStatus),
	),
	host: readString(element, attributes.host),
	document: readDocument(element),
	editLabel: readString(element, attributes.editLabel),
	preview: readPreview(element, previewToken),
	previewNavigation: {
		exitUrl: readString(element, attributes.previewExitHref),
	},
});

/** Declarative element for Lucid's isolated frontend toolbar. */
export class LucidToolbarElement extends HTMLElementBase {
	static observedAttributes = observedAttributes;
	static tagName = declarativeToolbarTagName;

	#controller: ToolbarController | null = null;
	#previewToken: string | null = null;
	#removingPreviewToken = false;
	#requiresSetup = true;
	#syncQueued = false;

	connectedCallback(): void {
		const previewToken = this.getAttribute(attributes.previewToken);
		if (previewToken !== null) this.#consumePreviewToken(previewToken);
		this.#requiresSetup = true;
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
			const previewState = readPreviewState(this);
			if (previewState !== "perspective" && previewState !== "scoped") {
				this.#previewToken = null;
			}
		}

		if (setupAttributes.has(name)) this.#requiresSetup = true;
		if (this.isConnected) this.#queueSync();
	}

	#consumePreviewToken(value: string): void {
		this.#previewToken = normalizePreviewToken(value);
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

			if (!this.#controller || this.#requiresSetup) {
				this.#controller?.cleanup();
				this.#controller = setupToolbar(
					readToolbarOptions(this, this.#previewToken),
				);
				this.#requiresSetup = false;
				return;
			}

			void this.#controller.update(readUpdate(this, this.#previewToken));
		});
	}
}
