import {
	decodePreviewFieldTarget,
	type PreviewFieldTarget,
	previewFieldAttribute,
} from "@lucidcms/preview-protocol";
import { previewFieldHintStyles } from "./styles.js";

type PreviewFieldInteractionOptions = {
	targetWindow: Window;
	isConnected: () => boolean;
	sendTarget: (target: PreviewFieldTarget) => boolean;
};

const previewFieldHintAttribute = "data-lucid-preview-target-hint";

const isElement = (value: EventTarget): value is Element =>
	typeof (value as Element).getAttribute === "function";

const getAnnotatedTarget = (event: MouseEvent): PreviewFieldTarget | null => {
	for (const item of event.composedPath()) {
		if (!isElement(item)) continue;
		const attribute = item.getAttribute(previewFieldAttribute);
		if (attribute === null) continue;
		const target = decodePreviewFieldTarget(attribute);
		if (target) return target;
	}
	return null;
};

/** Installs delegated Option/Alt-click field targeting for preview annotations. */
export const installPreviewFieldInteraction = ({
	targetWindow,
	isConnected,
	sendTarget,
}: PreviewFieldInteractionOptions): (() => void) => {
	let hintsVisible = false;
	let hintedElements: Element[] = [];
	const style = targetWindow.document.createElement("style");
	style.setAttribute("data-lucid-preview-field-hint-styles", "");
	style.textContent = previewFieldHintStyles;
	(targetWindow.document.head ?? targetWindow.document.documentElement).append(
		style,
	);

	const hideTargetHints = () => {
		if (!hintsVisible) return;
		hintsVisible = false;
		for (const element of hintedElements) {
			element.removeAttribute(previewFieldHintAttribute);
		}
		hintedElements = [];
	};
	const showTargetHints = () => {
		if (hintsVisible || !isConnected()) return;
		hintsVisible = true;
		const candidates = targetWindow.document.querySelectorAll(
			`[${previewFieldAttribute}]`,
		);
		for (const element of candidates) {
			const attribute = element.getAttribute(previewFieldAttribute);
			if (!attribute || !decodePreviewFieldTarget(attribute)) continue;
			element.setAttribute(previewFieldHintAttribute, "");
			hintedElements.push(element);
		}
	};
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Alt") showTargetHints();
	};
	const onKeyUp = (event: KeyboardEvent) => {
		if (event.key === "Alt") hideTargetHints();
	};
	const onVisibilityChange = () => {
		if (targetWindow.document.hidden) hideTargetHints();
	};
	const onClick = (event: MouseEvent) => {
		if (!event.altKey || event.button !== 0) return;

		const target = getAnnotatedTarget(event);
		if (!target || !sendTarget(target)) return;

		event.preventDefault();
		event.stopImmediatePropagation();
	};

	targetWindow.addEventListener("keydown", onKeyDown);
	targetWindow.addEventListener("keyup", onKeyUp);
	targetWindow.addEventListener("blur", hideTargetHints);
	targetWindow.document.addEventListener(
		"visibilitychange",
		onVisibilityChange,
	);
	targetWindow.document.addEventListener("click", onClick, true);
	return () => {
		targetWindow.removeEventListener("keydown", onKeyDown);
		targetWindow.removeEventListener("keyup", onKeyUp);
		targetWindow.removeEventListener("blur", hideTargetHints);
		targetWindow.document.removeEventListener(
			"visibilitychange",
			onVisibilityChange,
		);
		targetWindow.document.removeEventListener("click", onClick, true);
		hideTargetHints();
		style.remove();
	};
};
