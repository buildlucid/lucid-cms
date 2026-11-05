import { editAttribute, keepAttribute } from "@lucidcms/client/contract";
import {
	isCustomElement,
	recordServerMarkup,
	type ServerMarkup,
} from "./server-markup.js";

const isElement = (node: Node): node is Element =>
	node.nodeType === Node.ELEMENT_NODE;

/** Marked elements, such as Lucid's own preview UI, are never changed or removed. */
const isKept = (node: Node) =>
	isElement(node) && node.hasAttribute(keepAttribute);

/** Finds a kept element among `candidates` matching `incoming` by tag and ID that hasn't been matched yet, and claims it. */
const claimKeptMatch = (
	candidates: Iterable<Node>,
	incoming: Element,
	claimed: Set<Node>,
) => {
	for (const node of candidates) {
		if (
			isElement(node) &&
			isKept(node) &&
			!claimed.has(node) &&
			node.localName === incoming.localName &&
			node.id === incoming.id
		) {
			claimed.add(node);
			return node;
		}
	}
	return null;
};

/** What an element is matched by when it moves: its ID, or its field or brick marker, which stays the same when bricks are reordered. */
const keyOf = (node: Node) =>
	isElement(node) ? node.id || (node.getAttribute(editAttribute) ?? "") : "";

const isSameNode = (current: Node, next: Node) =>
	current.nodeType === next.nodeType &&
	current.nodeName === next.nodeName &&
	keyOf(current) === keyOf(next);

const morphAttributes = (current: Element, next: Element) => {
	for (const { name } of [...current.attributes]) {
		if (!next.hasAttribute(name)) current.removeAttribute(name);
	}
	for (const { name, value } of next.attributes) {
		if (current.getAttribute(name) !== value) current.setAttribute(name, value);
	}
};

const morphNode = (markup: ServerMarkup, current: Node, next: Node) => {
	if (!isElement(current) || !isElement(next)) {
		if (current.nodeValue !== next.nodeValue) {
			current.nodeValue = next.nodeValue;
		}
		return;
	}

	if (isCustomElement(current) || current.localName === "template") {
		if ((markup.get(current) ?? current.outerHTML) === next.outerHTML) {
			return;
		}
		recordServerMarkup(markup, next);
		current.replaceWith(next);
		return;
	}

	morphAttributes(current, next);
	morphChildren(markup, current, next);
};

/** Updates `current`'s children in place to match `next`'s, matching by position, tag and key. */
const morphChildren = (markup: ServerMarkup, current: Node, next: Node) => {
	let cursor = current.firstChild;
	const claimedKept = new Set<Node>();

	for (const incoming of [...next.childNodes]) {
		//* kept elements the server renders too stay as they are, rather than gaining a copy
		if (isElement(incoming) && isKept(incoming)) {
			const match = claimKeptMatch(current.childNodes, incoming, claimedKept);
			if (match) {
				if (match === cursor) cursor = cursor.nextSibling;
				continue;
			}
			while (cursor && isKept(cursor) && claimedKept.has(cursor)) {
				cursor = cursor.nextSibling;
			}
			recordServerMarkup(markup, incoming);
			current.insertBefore(incoming, cursor);
			continue;
		}

		while (cursor && isKept(cursor)) cursor = cursor.nextSibling;

		if (cursor && isSameNode(cursor, incoming)) {
			const following = cursor.nextSibling;
			morphNode(markup, cursor, incoming);
			cursor = following;
			continue;
		}

		//* moved elements keep their DOM when they have a key, eg. reordered bricks
		const key = keyOf(incoming);
		let match = key && cursor ? cursor.nextSibling : null;
		while (match && keyOf(match) !== key) {
			match = match.nextSibling;
		}
		if (match && isSameNode(match, incoming)) {
			current.insertBefore(match, cursor);
			morphNode(markup, match, incoming);
			continue;
		}

		recordServerMarkup(markup, incoming);
		current.insertBefore(incoming, cursor);
	}

	while (cursor) {
		const following = cursor.nextSibling;
		if (!isKept(cursor)) cursor.remove();
		cursor = following;
	}
};

//* links whose href depends on the page, such as canonical and alternate links, aren't assets
const assetLinks = new Set(["stylesheet", "modulepreload", "preload"]);

/** The key a head asset loads by, or null for anything else, eg. meta tags and inline scripts. */
const assetKey = (element: Element): string | null => {
	switch (element.localName) {
		case "link": {
			const rel = element.getAttribute("rel") ?? "";
			return assetLinks.has(rel)
				? `${rel}:${element.getAttribute("href")}`
				: null;
		}
		case "script": {
			const src = element.getAttribute("src");
			return src ? `script:${src}` : null;
		}
		case "style":
			return `style:${element.textContent}`;
		default:
			return null;
	}
};

/**
 * Adds missing stylesheets and scripts. Preserves existing assets, including styles injected by
 * Vite.
 */
const addHeadAssets = (current: Document, next: Document) => {
	const loaded = new Set(
		[...current.head.children].map(assetKey).filter((key) => key !== null),
	);
	for (const element of [...next.head.children]) {
		const key = assetKey(element);
		if (key === null || loaded.has(key)) continue;
		loaded.add(key);

		if (element.localName !== "script") {
			current.head.append(element);
			continue;
		}
		//* parsed scripts never run, so a fresh one is made in their place
		const script = current.createElement("script");
		for (const { name, value } of element.attributes) {
			script.setAttribute(name, value);
		}
		current.head.append(script);
	}
};

/** Updates the live page in place to match a newly rendered copy: its title, the head assets it needs and its body. */
export const morphDocument = (
	current: Document,
	next: Document,
	markup: ServerMarkup,
) => {
	const keepSelector = `[${keepAttribute}]`;
	const kept = [...current.body.querySelectorAll(keepSelector)];

	if (next.title && current.title !== next.title) current.title = next.title;
	addHeadAssets(current, next);
	morphAttributes(current.body, next.body);
	morphChildren(markup, current.body, next.body);

	//* kept elements whose ancestors were replaced take the place of their new copies
	const claimed = new Set<Node>(kept);
	for (const element of kept) {
		if (element.isConnected) continue;
		claimKeptMatch(
			current.body.querySelectorAll(keepSelector),
			element,
			claimed,
		)?.replaceWith(element);
	}
};
