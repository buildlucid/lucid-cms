type PreviewFocusPath = Array<string | number>;

type PreviewFocusStructure =
	| {
			brickIndex: number;
			type: "brick";
	  }
	| {
			brickIndex: number;
			type: "group";
			path: PreviewFocusPath;
	  }
	| {
			brickIndex: number;
			type: "tab" | "collapsible";
			key: string;
			pathPrefix: PreviewFocusPath;
	  };

type RevealPreviewFieldOptions = {
	fieldId: string;
	structureIds: string[];
	signal: AbortSignal;
	targetDocument?: Document;
	targetWindow?: Window;
	waitMs?: number;
	highlightMs?: number;
};

const FIELD_ID_PREFIX = "lucid-preview-field";
const STRUCTURE_ID_PREFIX = "lucid-preview-structure";

/** Finds the field or trigger's own label to position the focus indicator. */
const getPreviewFieldIndicator = (field: HTMLElement): HTMLElement => {
	const labels = field.querySelectorAll<HTMLElement>(
		"label, [data-preview-focus-label]",
	);
	//* a trigger isn't a field, so only labels outside any field are its own
	const owner = field.hasAttribute("data-preview-focus-field") ? field : null;
	for (const label of labels) {
		if (label.closest("[data-preview-focus-field]") === owner) return label;
	}
	return field;
};

/** Creates a scoped DOM id for a field wrapper in the builder. */
export const getPreviewFieldId = (props: {
	brickIndex: number;
	path: PreviewFocusPath;
}) =>
	`${FIELD_ID_PREFIX}:${props.brickIndex}:${encodeURIComponent(JSON.stringify(props.path))}`;

/** Creates a scoped DOM id for a builder reveal trigger. */
export const getPreviewStructureId = (props: PreviewFocusStructure) => {
	const path =
		props.type === "brick"
			? []
			: props.type === "group"
				? props.path
				: [...props.pathPrefix, props.key];
	return `${STRUCTURE_ID_PREFIX}:${props.type}:${props.brickIndex}:${encodeURIComponent(
		JSON.stringify(path),
	)}`;
};

/** The height of the sticky document header, which covers the top of the builder. */
const getHeaderHeight = (targetDocument: Document, targetWindow: Window) =>
	Number.parseFloat(
		targetWindow
			.getComputedStyle(targetDocument.documentElement)
			.getPropertyValue("--document-header-bar-height"),
	) || 0;

//* the highlight each indicator shows now, so highlighting it again restarts it
const activeHighlights = new WeakMap<HTMLElement, () => void>();

/** Briefly highlights a field label, restarting any existing animation and returning a function to remove it early. */
const highlightIndicator = (
	indicator: HTMLElement,
	targetWindow: Window,
	highlightMs = 1500,
) => {
	activeHighlights.get(indicator)?.();
	//* reading layout between removing and adding the class restarts its animation
	void indicator.offsetWidth;
	indicator.classList.add("preview-field-target-highlight");

	let active = true;
	const cleanup = () => {
		if (!active) return;
		active = false;
		targetWindow.clearTimeout(timeout);
		activeHighlights.delete(indicator);
		indicator.classList.remove("preview-field-target-highlight");
	};
	const timeout = targetWindow.setTimeout(cleanup, highlightMs);
	activeHighlights.set(indicator, cleanup);
	return cleanup;
};

//* space kept between the document header and the revealed label
const revealGap = 16;

/**
 * Scrolls a target and its label into the builder viewport, centred in the
 * space below the sticky document header, or aligned just under it when the
 * target is too tall to fit.
 */
const scrollPreviewFieldIntoView = (
	element: HTMLElement,
	indicator: HTMLElement,
	targetWindow: Window = window,
) => {
	const reducedMotion =
		targetWindow.matchMedia?.("(prefers-reduced-motion: reduce)").matches ===
		true;
	const header = getHeaderHeight(element.ownerDocument, targetWindow);
	const labelAbove = Math.max(
		0,
		element.getBoundingClientRect().top - indicator.getBoundingClientRect().top,
	);
	const margin = header + revealGap + labelAbove;

	//* the margin makes room for the header and label; the scroll target is set when the scroll starts, so it can be removed straight after
	element.style.scrollMarginTop = `${margin}px`;
	element.scrollIntoView({
		behavior: reducedMotion ? "auto" : "smooth",
		block:
			element.offsetHeight + margin <= targetWindow.innerHeight
				? "center"
				: "start",
		inline: "nearest",
	});
	element.style.removeProperty("scroll-margin-top");
};

/** Waits for lazy builder content to render after an ancestor opens. */
const waitForElement = (props: {
	id: string;
	signal: AbortSignal;
	targetDocument: Document;
	targetWindow: Window;
	waitMs: number;
}): Promise<HTMLElement | null> => {
	const existing = props.targetDocument.getElementById(props.id);
	if (existing instanceof HTMLElement) return Promise.resolve(existing);
	if (props.signal.aborted) return Promise.resolve(null);

	return new Promise((resolve) => {
		let settled = false;
		const finish = (element: HTMLElement | null) => {
			if (settled) return;
			settled = true;
			observer.disconnect();
			props.targetWindow.clearTimeout(timeout);
			props.signal.removeEventListener("abort", abort);
			resolve(element);
		};
		const find = () => {
			const element = props.targetDocument.getElementById(props.id);
			if (element instanceof HTMLElement) finish(element);
		};
		const abort = () => finish(null);
		const observer = new MutationObserver(find);
		const timeout = props.targetWindow.setTimeout(
			() => finish(null),
			props.waitMs,
		);

		observer.observe(props.targetDocument.documentElement, {
			childList: true,
			subtree: true,
		});
		props.signal.addEventListener("abort", abort, { once: true });
		find();
	});
};

/** Opens structural controls, then scrolls and highlights the target field. */
export const revealPreviewField = async (
	options: RevealPreviewFieldOptions,
): Promise<(() => void) | null> => {
	const targetDocument = options.targetDocument ?? document;
	const targetWindow = options.targetWindow ?? window;
	const waitMs = options.waitMs ?? 1000;

	for (const id of options.structureIds) {
		const trigger = await waitForElement({
			id,
			signal: options.signal,
			targetDocument,
			targetWindow,
			waitMs,
		});
		if (!trigger) return null;
		//* collapsibles say so themselves, a tab is open when it is selected
		const isOpen =
			trigger.dataset.previewFocusOpen === "true" ||
			trigger.getAttribute("aria-selected") === "true";
		if (!isOpen) trigger.click();
	}

	const field = await waitForElement({
		id: options.fieldId,
		signal: options.signal,
		targetDocument,
		targetWindow,
		waitMs,
	});
	if (!field || options.signal.aborted) return null;

	const indicator = getPreviewFieldIndicator(field);
	scrollPreviewFieldIntoView(field, indicator, targetWindow);
	const removeHighlight = highlightIndicator(
		indicator,
		targetWindow,
		options.highlightMs,
	);
	const cleanup = () => {
		options.signal.removeEventListener("abort", cleanup);
		removeHighlight();
	};
	options.signal.addEventListener("abort", cleanup, { once: true });

	return cleanup;
};

/** Highlights rendered fields without opening hidden content, scrolling only when none are in view and returning the highlighted count. */
export const highlightPreviewFields = (fieldIds: string[]) => {
	const shown = fieldIds.flatMap((id) => {
		const element = document.getElementById(id);
		//* collapsed content can stay in the page without taking up space
		return element instanceof HTMLElement && element.getClientRects().length
			? [element]
			: [];
	});
	const [first] = shown;
	if (!first) return 0;

	const header = getHeaderHeight(document, window);
	const inView = shown.some((element) => {
		const rect = element.getBoundingClientRect();
		return rect.bottom > header && rect.top < window.innerHeight;
	});
	if (!inView) {
		scrollPreviewFieldIntoView(first, getPreviewFieldIndicator(first));
	}
	for (const element of shown) {
		highlightIndicator(getPreviewFieldIndicator(element), window);
	}
	return shown.length;
};
