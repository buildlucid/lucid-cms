import { type Extensions, flattenExtensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

const flattenRichTextExtensions = (inputExtensions: Extensions): Extensions => {
	return flattenExtensions(inputExtensions).filter(
		(extension) => !extension.config.addExtensions,
	);
};

const createCoreExtensions = (): Extensions => {
	return flattenRichTextExtensions([
		StarterKit.configure({
			link: {
				openOnClick: true,
			},
		}),
	]);
};

export const extensions = createCoreExtensions();

export const mergeExtensions = (customExtensions?: Extensions): Extensions => {
	if (!customExtensions?.length) {
		return extensions;
	}

	const mergedExtensions = new Map(
		extensions.map((extension) => [extension.name, extension]),
	);

	for (const extension of flattenRichTextExtensions(customExtensions)) {
		mergedExtensions.set(extension.name, extension);
	}

	return Array.from(mergedExtensions.values());
};
