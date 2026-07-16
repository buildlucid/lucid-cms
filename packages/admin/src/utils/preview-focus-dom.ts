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

/** Finds the label owned by a field wrapper so the indicator stays compact. */
const getPreviewFieldIndicator = (field: HTMLElement): HTMLElement => {
	const labels = field.querySelectorAll<HTMLElement>(
		"label, [data-preview-focus-label]",
	);
	for (const label of labels) {
		if (label.closest("[data-preview-focus-field]") === field) return label;
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

/** Scrolls a rendered preview target into the builder viewport. */
const scrollPreviewFieldIntoView = (
	element: HTMLElement,
	targetWindow: Window = window,
) => {
	const reducedMotion =
		targetWindow.matchMedia?.("(prefers-reduced-motion: reduce)").matches ===
		true;
	element.scrollIntoView({
		behavior: reducedMotion ? "auto" : "smooth",
		block: "center",
		inline: "nearest",
	});
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
		if (trigger.dataset.previewFocusOpen !== "true") trigger.click();
	}

	const field = await waitForElement({
		id: options.fieldId,
		signal: options.signal,
		targetDocument,
		targetWindow,
		waitMs,
	});
	if (!field || options.signal.aborted) return null;

	scrollPreviewFieldIntoView(field, targetWindow);
	const indicator = getPreviewFieldIndicator(field);
	indicator.classList.add("preview-field-target-highlight");

	let active = true;
	const cleanup = () => {
		if (!active) return;
		active = false;
		targetWindow.clearTimeout(timeout);
		options.signal.removeEventListener("abort", cleanup);
		indicator.classList.remove("preview-field-target-highlight");
	};
	const timeout = targetWindow.setTimeout(cleanup, options.highlightMs ?? 1500);
	options.signal.addEventListener("abort", cleanup, { once: true });

	return cleanup;
};
