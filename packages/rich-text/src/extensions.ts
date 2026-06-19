import {
	type AnyConfig,
	type AnyExtension,
	type Extensions,
	getExtensionField,
} from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

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
