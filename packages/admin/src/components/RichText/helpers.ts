import type { RichTextJSON } from "@lucidcms/rich-text";
import type { DocumentRef, RichTextUserVariableField, UserRef } from "@types";
import T from "@/translations";
import type { RichTextOptions, RichTextVariableSelection } from "./types";

export const isRichTextOptionEnabled = (
	value: boolean | unknown[] | undefined,
) => value === true || (Array.isArray(value) && value.length > 0);

export const isRichTextVariableOptionEnabled = (
	value: RichTextOptions["variables"],
) => isRichTextOptionEnabled(value?.document) || (value?.user?.length ?? 0) > 0;

/** Intersects configured document-variable collections with those the editor can read. */
export const getReadableRichTextVariableCollectionKeys = (
	configured: boolean | string[] | undefined,
	readableCollectionKeys: string[],
): string[] => {
	if (configured === true) return readableCollectionKeys;
	if (!Array.isArray(configured)) return [];

	const readable = new Set(readableCollectionKeys);
	return configured.filter((collectionKey) => readable.has(collectionKey));
};

/** Removes user-variable fields when the editor cannot read user resources. */
export const getReadableRichTextUserVariableFields = (
	configured: RichTextUserVariableField[] | undefined,
	canReadUsers: boolean,
): RichTextUserVariableField[] => (canReadUsers ? (configured ?? []) : []);

/** Checks whether rich-text JSON contains text or a reference node. */
export const richTextHasContent = (
	value: RichTextJSON | null | undefined,
): boolean => {
	if (!value) return false;
	if (typeof value.text === "string" && value.text.length > 0) return true;
	if (
		value.type === "lucidDocument" ||
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

export const getRichTextUserFieldText = (
	user: NonNullable<UserRef>,
	fieldKey: RichTextUserVariableField,
): string => user[fieldKey] ?? "";

export const isRichTextUserVariableField = (
	value: unknown,
): value is RichTextUserVariableField =>
	value === "firstName" ||
	value === "lastName" ||
	value === "username" ||
	value === "email";

/** Builds persisted variable identity attributes plus its immediate UI value. */
export const getRichTextVariableAttrs = (
	selection: RichTextVariableSelection,
	locale?: string,
) => {
	if (selection.source === "document") {
		return {
			source: selection.source,
			collectionKey: selection.collectionKey,
			documentId: selection.documentId,
			userId: null,
			fieldKey: selection.fieldKey,
			value: getRichTextDocumentFieldText(
				selection.document,
				selection.fieldKey,
				locale,
			),
		};
	}

	return {
		source: selection.source,
		collectionKey: null,
		documentId: null,
		userId: selection.userId,
		fieldKey: selection.fieldKey,
		value: getRichTextUserFieldText(selection.user, selection.fieldKey),
	};
};
