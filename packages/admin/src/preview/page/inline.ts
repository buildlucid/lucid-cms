import { previewProtocolLimits, toShownText } from "../protocol/index.js";
import { previewKeepAttribute } from "./constants.js";

//* attributes typing changes on the element, put back as they were once it ends
const borrowedAttributes = [
	"contenteditable",
	"spellcheck",
	"style",
	previewKeepAttribute,
] as const;

type InlineSession = {
	element: HTMLElement;
	multiline: boolean;
	/** The element's children before typing, which the page's framework still holds. */
	nodes: ChildNode[];
	/** Its text nodes with their text before typing. */
	texts: Array<{ node: Text; data: string }>;
	attributes: Array<{ name: string; value: string | null }>;
	/** The text last sent, so edits that change nothing aren't. */
	sent: string;
	cleanup: () => void;
};

type InlineEditingOptions = {
	targetWindow: Window;
	/** Sends the text typed so far. */
	onInput: (value: string) => void;
	/** Runs once typing ends, keeping the text or, when `cancelled`, going back to what was there. */
	onEnd: (cancelled: boolean) => void;
};

const isText = (node: Node): node is Text => node.nodeType === Node.TEXT_NODE;

/**
 * What an element shows when it holds nothing but text and line breaks, read as typed text, or
 * null when it holds anything else, such as other elements. Comments that frameworks leave
 * between text are skipped.
 */
export const readPlainText = (element: Element): string | null => {
	let text = "";
	for (const node of element.childNodes) {
		if (isText(node)) text += node.data;
		else if (node.nodeName === "BR") text += "\n";
		else if (node.nodeType !== Node.COMMENT_NODE) return null;
		if (text.length > previewProtocolLimits.text) return null;
	}
	return text;
};

/** Text typed into an element, with line breaks for `<br>`s and the blocks browsers add on Enter. */
const readTypedText = (parent: Node): string => {
	let text = "";
	for (const node of parent.childNodes) {
		if (isText(node)) {
			text += node.data;
		} else if (node.nodeName === "BR") {
			text += "\n";
		} else if (node.nodeType !== Node.COMMENT_NODE) {
			if (text && !text.endsWith("\n")) text += "\n";
			text += readTypedText(node);
		}
	}
	return text;
};

/** A field's value from what was typed: one line with spaces collapsed, or lines with their breaks kept. */
const toValue = (text: string, multiline: boolean) => {
	const value = multiline
		? text.replace(/ /g, " ").replace(/\r\n?/g, "\n").trim()
		: toShownText(text);
	return value.slice(0, previewProtocolLimits.text);
};

/** Turns on typing, plain text only where the browser supports it. */
const makeEditable = (element: HTMLElement) => {
	try {
		element.contentEditable = "plaintext-only";
	} catch {
		element.contentEditable = "true";
	}
	if (element.contentEditable !== "plaintext-only") {
		element.contentEditable = "true";
	}
};

/** Puts the caret at a point in the element, or at its end. */
const placeCaret = (
	targetWindow: Window,
	element: HTMLElement,
	point: { x: number; y: number } | null,
) => {
	const { document } = targetWindow;
	const selection = targetWindow.getSelection();
	if (!selection) return;
	let range: Range | null = null;
	if (point && typeof document.caretPositionFromPoint === "function") {
		const position = document.caretPositionFromPoint(point.x, point.y);
		if (position && element.contains(position.offsetNode)) {
			range = document.createRange();
			range.setStart(position.offsetNode, position.offset);
		}
	} else if (point && typeof document.caretRangeFromPoint === "function") {
		const caret = document.caretRangeFromPoint(point.x, point.y);
		if (caret && element.contains(caret.startContainer)) range = caret;
	}
	if (!range) {
		range = document.createRange();
		range.selectNodeContents(element);
	}
	range.collapse(false);
	selection.removeAllRanges();
	selection.addRange(range);
};

/**
 * Edits one element inline, restoring its original nodes afterward to preserve framework
 * ownership. Enter finishes single-line input; Cmd/Ctrl-Enter finishes multiline. Escape cancels;
 * leaving commits.
 */
export const createInlineEditing = (options: InlineEditingOptions) => {
	const { targetWindow } = options;
	const { document } = targetWindow;
	let session: InlineSession | null = null;

	const end = (cancelled: boolean) => {
		const current = session;
		if (!current) return;
		session = null;
		current.cleanup();

		const { element } = current;
		const value = toValue(readTypedText(element), current.multiline);
		if (!cancelled && value !== current.sent) options.onInput(value);
		element.replaceChildren(...current.nodes);
		for (const { node, data } of current.texts) node.data = data;
		//* one text node shows the new text until the page re-renders, which writes the same
		const [only] = current.texts;
		if (!cancelled && only && current.texts.length === 1)
			only.node.data = value;
		for (const { name, value: attribute } of current.attributes) {
			if (attribute === null) element.removeAttribute(name);
			else element.setAttribute(name, attribute);
		}
		if (document.activeElement === element) element.blur();
		options.onEnd(cancelled);
	};

	return {
		/**
		 * Starts typing into an element, at a point in it or at its end. `clear` empties a
		 * placeholder first. Returns whether it started, which needs the element to take focus.
		 */
		start: (
			element: HTMLElement,
			props: {
				multiline: boolean;
				clear: boolean;
				point: { x: number; y: number } | null;
			},
		) => {
			end(false);
			if (!element.isConnected || readPlainText(element) === null) {
				return false;
			}

			const nodes = [...element.childNodes];
			const texts = nodes
				.filter(isText)
				.map((node) => ({ node, data: node.data }));
			const attributes = borrowedAttributes.map((name) => ({
				name,
				value: element.getAttribute(name),
			}));
			if (props.clear) {
				for (const { node } of texts) node.data = "";
				for (const node of nodes) {
					if (node.nodeName === "BR") node.remove();
				}
			}

			makeEditable(element);
			element.spellcheck = true;
			//* morphing the page leaves it alone, and the builder's outline stands in for the browser's
			element.setAttribute(previewKeepAttribute, "");
			element.style.setProperty("outline", "none", "important");
			element.style.setProperty("cursor", "text", "important");
			element.style.setProperty("user-select", "text", "important");
			element.style.setProperty("-webkit-user-select", "text", "important");

			const onKeyDown = (event: KeyboardEvent) => {
				if (event.isComposing) return;
				if (event.key === "Escape") {
					event.preventDefault();
					event.stopPropagation();
					end(true);
					return;
				}
				if (
					event.key === "Enter" &&
					(!props.multiline || event.metaKey || event.ctrlKey)
				) {
					event.preventDefault();
					event.stopPropagation();
					end(false);
				}
			};
			const onInput = () => {
				const current = session;
				if (!current) return;
				const value = toValue(readTypedText(element), current.multiline);
				if (value === current.sent) return;
				current.sent = value;
				options.onInput(value);
			};
			//* pasted text arrives as plain text, on one line unless the field has several
			const onPaste = (event: ClipboardEvent) => {
				event.preventDefault();
				const text = event.clipboardData?.getData("text/plain") ?? "";
				document.execCommand(
					"insertText",
					false,
					props.multiline ? text : text.replace(/\s+/g, " "),
				);
			};
			//* drops are blocked, as they could bring in markup
			const onDrop = (event: DragEvent) => {
				event.preventDefault();
			};
			const onBlur = () => end(false);

			element.addEventListener("keydown", onKeyDown);
			element.addEventListener("input", onInput);
			element.addEventListener("paste", onPaste);
			element.addEventListener("drop", onDrop);
			element.addEventListener("blur", onBlur);
			session = {
				element,
				multiline: props.multiline,
				nodes,
				texts,
				attributes,
				sent: toValue(readTypedText(element), props.multiline),
				cleanup: () => {
					element.removeEventListener("keydown", onKeyDown);
					element.removeEventListener("input", onInput);
					element.removeEventListener("paste", onPaste);
					element.removeEventListener("drop", onDrop);
					element.removeEventListener("blur", onBlur);
				},
			};

			element.focus({ preventScroll: true });
			if (document.activeElement !== element) {
				end(true);
				return false;
			}
			placeCaret(targetWindow, element, props.clear ? null : props.point);
			return true;
		},
		/** Finishes typing, keeping what was typed. */
		stop: () => end(false),
		/** The element being typed into, if any. */
		element: () => session?.element ?? null,
	};
};
