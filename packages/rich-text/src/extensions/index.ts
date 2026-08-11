import {
	type AnyConfig,
	type AnyExtension,
	type Extensions,
	getExtensionField,
} from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { LucidDocument } from "./document/index.js";
import { LucidEmbeddedBrick } from "./embedded-brick/index.js";
import { LucidLink } from "./link/index.js";
import { LucidMedia } from "./media/index.js";
import { LucidVariable } from "./variable/index.js";

const flattenRichTextExtensions = (inputExtensions: Extensions): Extensions => {
	return inputExtensions.flatMap((extension) => {
		const addExtensions = getExtensionField<AnyConfig["addExtensions"]>(
			extension,
			"addExtensions",
			{
				name: extension.name,
				options: extension.options,
				storage: extension.storage,
			},
		);

		if (extension.type !== "extension" || !addExtensions) {
			return extension;
		}

		return flattenRichTextExtensions(addExtensions() as AnyExtension[]);
	});
};

const createCoreExtensions = (): Extensions => {
	return flattenRichTextExtensions([
		StarterKit.configure({
			link: false,
		}),
		LucidLink.configure({
			openOnClick: false,
			HTMLAttributes: {
				target: null,
				rel: null,
				class: null,
			},
		}),
		LucidDocument,
		LucidMedia,
		LucidVariable,
		LucidEmbeddedBrick,
	]);
};

export const extensions = createCoreExtensions();

/** Merges custom extensions by name over Lucid's defaults. */
export const mergeExtensions = (customExtensions?: Extensions): Extensions => {
	if (!customExtensions?.length) return extensions;

	const mergedExtensions = new Map(
		extensions.map((extension) => [extension.name, extension]),
	);

	for (const extension of flattenRichTextExtensions(customExtensions)) {
		mergedExtensions.set(extension.name, extension);
	}

	return Array.from(mergedExtensions.values());
};

export { LucidDocument } from "./document/index.js";
export { LucidEmbeddedBrick } from "./embedded-brick/index.js";
export { LucidLink } from "./link/index.js";
export { LucidMedia } from "./media/index.js";
export { LucidVariable } from "./variable/index.js";
