import type { PreviewRect } from "../protocol/index.js";
import { previewKeepAttribute, previewOverlayTagName } from "./constants.js";

//* frames the layer keeps following elements for once they stop moving
const SETTLE_FRAMES = 12;

export type Layer = {
	host: HTMLElement;
	root: ShadowRoot;
	/** Redraws every frame until nothing has moved for a moment. */
	schedule: () => void;
	remove: () => void;
};

/**
 * A layer above the page in its own shadow root, so the page's DOM and styles are never
 * changed. `draw` returns whether anything moved, and keeps running while things move, eg.
 * during smooth scrolling or a re-render.
 */
export const createLayer = (
	targetWindow: Window,
	styles: string,
	draw: () => boolean,
): Layer => {
	const { document } = targetWindow;
	const host = document.createElement(previewOverlayTagName);
	host.setAttribute(previewKeepAttribute, "");
	const root = host.attachShadow({ mode: "open" });
	const style = document.createElement("style");
	style.textContent = styles;
	root.append(style);
	(document.body ?? document.documentElement).append(host);

	let frame: number | undefined;
	let still = 0;
	const tick = () => {
		frame = undefined;
		still = draw() ? 0 : still + 1;
		if (still < SETTLE_FRAMES) frame = targetWindow.requestAnimationFrame(tick);
	};
	const schedule = () => {
		still = 0;
		if (frame === undefined) frame = targetWindow.requestAnimationFrame(tick);
	};
	const observer = new MutationObserver(schedule);
	observer.observe(document.body ?? document.documentElement, {
		subtree: true,
		childList: true,
		attributes: true,
		characterData: true,
	});
	targetWindow.addEventListener("scroll", schedule, {
		capture: true,
		passive: true,
	});
	targetWindow.addEventListener("resize", schedule);

	return {
		host,
		root,
		schedule,
		remove: () => {
			if (frame !== undefined) targetWindow.cancelAnimationFrame(frame);
			observer.disconnect();
			targetWindow.removeEventListener("scroll", schedule, { capture: true });
			targetWindow.removeEventListener("resize", schedule);
			host.remove();
		},
	};
};

export const create = <TTag extends keyof HTMLElementTagNameMap>(
	document: Document,
	tag: TTag,
	className: string,
	html?: string,
) => {
	const element = document.createElement(tag);
	element.className = className;
	if (html !== undefined) element.innerHTML = html;
	return element;
};

// ----------------------------------------
// Geometry

export const rectOf = (element: Element): PreviewRect => {
	const { x, y, width, height } = element.getBoundingClientRect();
	return { x, y, width, height };
};

/**
 * The box an outline draws around a rect: 4px outside it, and 3px inside the page's sides so
 * full-width bricks keep theirs and the selection's dot. The builder draws its outlines the same way.
 */
export const outlineOf = (targetWindow: Window, rect: PreviewRect) => {
	const left = Math.max(rect.x - 4, 3);
	const right = Math.min(
		rect.x + rect.width + 4,
		targetWindow.document.documentElement.clientWidth - 3,
	);
	return {
		x: left,
		y: rect.y - 4,
		width: Math.max(right - left, 0),
		height: rect.height + 8,
	};
};

const placed = new WeakMap<HTMLElement, string>();

/** Moves, and unless `sized` is false sizes, a box. Returns whether it changed. */
export const setBox = (
	element: HTMLElement,
	rect: PreviewRect,
	sized = true,
) => {
	const key = `${rect.x}|${rect.y}|${rect.width}|${rect.height}|${sized}`;
	if (placed.get(element) === key) return false;
	placed.set(element, key);
	//* `translate` rather than `transform`, so entrance animations can scale without moving it
	element.style.translate = `${Math.round(rect.x)}px ${Math.round(rect.y)}px`;
	if (sized) {
		element.style.width = `${Math.round(rect.width)}px`;
		element.style.height = `${Math.round(rect.height)}px`;
	}
	return true;
};

/**
 * The bottom of a fixed or sticky bar across the top of the page, such as a site header, so
 * controls that stick to the top of the view stay below it rather than covering it.
 */
export const topInset = (targetWindow: Window) => {
	const { document } = targetWindow;
	if (typeof document.elementsFromPoint !== "function") return 0;
	for (const element of document.elementsFromPoint(
		targetWindow.innerWidth / 2,
		1,
	)) {
		for (
			let node: Element | null = element;
			node && node !== document.body;
			node = node.parentElement
		) {
			const { position } = targetWindow.getComputedStyle(node);
			if (position !== "fixed" && position !== "sticky") continue;
			const rect = node.getBoundingClientRect();
			if (rect.top <= 1 && rect.height < targetWindow.innerHeight / 3) {
				return rect.bottom;
			}
		}
	}
	return 0;
};

export const isInView = (targetWindow: Window, element: Element) => {
	const rect = element.getBoundingClientRect();
	return rect.bottom > 0 && rect.top < targetWindow.innerHeight;
};

export const scrollToElement = (targetWindow: Window, element: Element) => {
	const reducedMotion =
		targetWindow.matchMedia?.("(prefers-reduced-motion: reduce)").matches ===
		true;
	element.scrollIntoView({
		behavior: reducedMotion ? "auto" : "smooth",
		block:
			element.getBoundingClientRect().height < targetWindow.innerHeight * 0.7
				? "center"
				: "start",
	});
};
