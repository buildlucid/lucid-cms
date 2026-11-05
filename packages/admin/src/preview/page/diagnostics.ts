import { editAttribute } from "@lucidcms/client/contract";
import type { PreviewEditing } from "../protocol/index.js";
import { isEditedTarget, readTarget } from "./targets.js";

const logged = new Set<string>();

/** Says something to whoever builds the page, once, in its own console. */
const tell = (key: string, ...message: unknown[]) => {
	if (logged.has(key)) return;
	logged.add(key);
	console.warn("Lucid preview:", ...message);
};

/** Says in the page's console what keeps parts of it from being edited on: markup editable() didn't write, or none for the edited document. */
export const checkEditMarkup = (
	document: Document,
	editing: PreviewEditing,
) => {
	let edited = false;
	for (const element of document.querySelectorAll(`[${editAttribute}]`)) {
		const target = readTarget(element);
		if (target && isEditedTarget(target, editing)) edited = true;
		if (!target) {
			tell(
				`invalid:${element.getAttribute(editAttribute)}`,
				`this element's ${editAttribute} wasn't written by editable(), so it can't be picked.`,
				element,
			);
		}
	}
	if (!edited) {
		tell(
			`unmarked:${editing.collectionKey}:${editing.documentId}`,
			"nothing on this page is marked as part of the document being edited. Mark the elements that show its fields with editable() to edit them here.",
		);
	}
};
