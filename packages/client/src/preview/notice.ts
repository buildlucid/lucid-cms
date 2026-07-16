import { previewNoticeTagName, scopedLockMessage } from "./constants.js";
import { previewNoticeStyles } from "./styles.js";

type LucidPreviewNoticeElement = HTMLElement & {
	show: () => void;
};

const registerPreviewNoticeElement = (targetWindow: Window): void => {
	if (targetWindow.customElements.get(previewNoticeTagName)) return;
	const WindowHTMLElement = (targetWindow as Window & typeof globalThis)
		.HTMLElement;

	class PreviewNoticeElement extends WindowHTMLElement {
		#hideTimeout: number | undefined;

		constructor() {
			super();
			const root = this.attachShadow({ mode: "open" });
			root.innerHTML = `<style>${previewNoticeStyles}</style><div class="notice" role="status" aria-live="polite">${scopedLockMessage}</div>`;
		}

		disconnectedCallback(): void {
			if (this.#hideTimeout !== undefined) {
				targetWindow.clearTimeout(this.#hideTimeout);
			}
		}

		show(): void {
			this.hidden = false;
			if (this.#hideTimeout !== undefined) {
				targetWindow.clearTimeout(this.#hideTimeout);
			}
			this.#hideTimeout = targetWindow.setTimeout(() => {
				this.hidden = true;
				this.#hideTimeout = undefined;
			}, 4500);
		}
	}

	targetWindow.customElements.define(
		previewNoticeTagName,
		PreviewNoticeElement,
	);
};

export const createPreviewNotice = (
	targetWindow: Window,
): LucidPreviewNoticeElement => {
	registerPreviewNoticeElement(targetWindow);
	const element = targetWindow.document.createElement(
		previewNoticeTagName,
	) as LucidPreviewNoticeElement;
	element.hidden = true;
	(targetWindow.document.body ?? targetWindow.document.documentElement).append(
		element,
	);
	return element;
};
