import { toolbarTagName } from "./constants.js";
import { editIcon, exitIcon, lucidIcon } from "./icons.js";
import { toolbarStyles } from "./styles.js";
import type { PreviewKind } from "./types.js";

const toolbarMarkup = `
	<style>${toolbarStyles}</style>
	<div class="wrap">
		<div class="pill" part="pill">
			<a class="action admin" rel="noreferrer" referrerpolicy="no-referrer">${lucidIcon}<span class="brand-label">Lucid CMS</span></a>
			<span class="separator" aria-hidden="true"></span>
			<div class="status" role="status" hidden><span class="status-dot" aria-hidden="true"></span><span class="status-label"></span><span class="separator status-separator" aria-hidden="true"></span></div>
			<div class="actions">
				<a class="action edit" rel="noreferrer" referrerpolicy="no-referrer" hidden>${editIcon}</a>
				<button class="action exit" type="button" hidden>${exitIcon}</button>
			</div>
		</div>
	</div>
`;

type ToolbarElementModel = {
	adminHref: string;
	previewMode: PreviewKind | null;
	edit: { href: string; label: string } | null;
	exitPreview: (() => Promise<void>) | null;
};

type ToolbarElementInstance = HTMLElement & {
	setModel: (model: ToolbarElementModel) => void;
};

const getRequiredElement = <TElement extends Element>(
	root: ShadowRoot,
	selector: string,
): TElement => {
	const element = root.querySelector<TElement>(selector);
	if (!element)
		throw new Error("Lucid toolbar markup could not be initialized.");
	return element;
};

const registerToolbarElement = (targetWindow: Window): void => {
	if (targetWindow.customElements.get(toolbarTagName)) return;
	const WindowHTMLElement = (targetWindow as Window & typeof globalThis)
		.HTMLElement;

	class LucidPreviewToolbarElement extends WindowHTMLElement {
		readonly #admin: HTMLAnchorElement;
		readonly #status: HTMLElement;
		readonly #statusLabel: HTMLElement;
		readonly #edit: HTMLAnchorElement;
		readonly #exit: HTMLButtonElement;
		#exitPreview: (() => Promise<void>) | null = null;

		constructor() {
			super();
			const root = this.attachShadow({ mode: "open" });
			root.innerHTML = toolbarMarkup;
			this.#admin = getRequiredElement(root, ".admin");
			this.#status = getRequiredElement(root, ".status");
			this.#statusLabel = getRequiredElement(root, ".status-label");
			this.#edit = getRequiredElement(root, ".edit");
			this.#exit = getRequiredElement(root, ".exit");
			this.#exit.addEventListener("click", () => {
				void this.#exitPreview?.().catch(() => undefined);
			});
		}

		setModel(model: ToolbarElementModel): void {
			this.#admin.href = model.adminHref;
			this.#admin.title = "Open Lucid admin";
			this.#admin.setAttribute("aria-label", "Open Lucid admin");

			const status = model.previewMode
				? model.previewMode === "scoped"
					? {
							label: "Scoped preview",
							description: "Preview access is limited to this page.",
						}
					: {
							label: "Navigable preview",
							description: "Navigation stays inside this preview.",
						}
				: null;
			this.#status.hidden = status === null;
			if (status && model.previewMode) {
				this.#status.dataset.mode = model.previewMode;
				this.#statusLabel.textContent = status.label;
				this.#status.title = status.description;
				this.#status.setAttribute("aria-label", status.description);
			}

			this.#edit.hidden = model.edit === null;
			if (model.edit) {
				this.#edit.href = model.edit.href;
				this.#edit.title = model.edit.label;
				this.#edit.setAttribute("aria-label", model.edit.label);
			}

			this.#exitPreview = model.exitPreview;
			this.#exit.hidden = model.exitPreview === null;
			this.#exit.title = "Exit preview";
			this.#exit.setAttribute("aria-label", "Exit preview");
		}
	}

	targetWindow.customElements.define(
		toolbarTagName,
		LucidPreviewToolbarElement,
	);
};

/** Creates and attaches the isolated toolbar element. */
export const createToolbarElement = (
	targetWindow: Window,
): ToolbarElementInstance => {
	registerToolbarElement(targetWindow);
	const element = targetWindow.document.createElement(
		toolbarTagName,
	) as ToolbarElementInstance;
	(targetWindow.document.body ?? targetWindow.document.documentElement).append(
		element,
	);
	return element;
};
