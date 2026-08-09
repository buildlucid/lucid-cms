import type { RichTextJSON } from "@lucidcms/rich-text";
import type { ContentRoute, DocumentRef } from "@types";
import T from "@/translations";
import type { RichTextMediaType, RichTextOptions } from "./types";

export const isRichTextOptionEnabled = (
	value: boolean | unknown[] | undefined,
) => value === true || (Array.isArray(value) && value.length > 0);

export const getRichTextMediaTypes = (
	value: RichTextOptions["media"],
): RichTextMediaType[] =>
	value === true
		? ["image", "audio", "video"]
		: Array.isArray(value)
			? value
			: [];

/** Checks whether rich-text JSON contains text or a reference node. */
export const richTextHasContent = (
	value: RichTextJSON | null | undefined,
): boolean => {
	if (!value) return false;
	if (typeof value.text === "string" && value.text.length > 0) return true;
	if (
		value.type === "lucidMedia" ||
		value.type === "lucidVariable" ||
		value.type === "lucidEmbeddedBrick"
	) {
		return true;
	}
	return value.content?.some(richTextHasContent) ?? false;
};

export const getRichTextDocumentFieldText = (
	document: DocumentRef,
	fieldKey: string,
	locale?: string,
): string => {
	const field = document.fields?.[fieldKey];
	if (!field) return "";

	const value = field.translations
		? ((locale ? field.translations[locale] : undefined) ??
			Object.values(field.translations).find(
				(translation) => translation !== undefined,
			) ??
			field.value)
		: field.value;

	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}
	if (typeof value === "boolean") {
		return value ? T()("common.yes") : T()("common.no");
	}
	if (
		Array.isArray(value) &&
		value.every((item) => typeof item === "string" || typeof item === "number")
	) {
		return value.join(" – ");
	}

	return "";
};

/** Builds a readable selector label from a content route's configured fields. */
export const getRichTextDocumentLabel = (
	document: DocumentRef,
	route: ContentRoute,
	locale?: string,
): string => {
	const label = (route.label?.fields ?? [])
		.map((fieldKey) => getRichTextDocumentFieldText(document, fieldKey, locale))
		.filter(Boolean)
		.join(" · ");

	return (
		label ||
		T()("editor.rich.text.document.fallback", {
			collection: document.collectionKey,
			id: document.id,
		})
	);
};
