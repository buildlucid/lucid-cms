import type { RichTextHydratedMedia, RichTextJSON } from "@lucidcms/rich-text";
import type { DocumentRef, Media } from "../../../../../../types/response.js";
import { getObject } from "../../../../../../utils/helpers/get-typed-value.js";
import type { CustomFieldResponseFormatContext } from "../../../types.js";

const isDocumentRef = (value: unknown): value is DocumentRef => {
	const reference = getObject(value);
	return (
		reference !== null &&
		typeof reference.id === "number" &&
		typeof reference.collectionKey === "string"
	);
};

const isMediaRef = (value: unknown): value is Media => {
	const reference = getObject(value);
	const file = getObject(reference?.file);
	return (
		reference !== null &&
		typeof reference.id === "number" &&
		typeof reference.type === "string" &&
		file !== null &&
		typeof file.url === "string"
	);
};

const getLocalizedString = (value: unknown, locale: string): string => {
	const translations = getObject(value);
	if (!translations) return "";
	if (typeof translations[locale] === "string") return translations[locale];
	return (
		Object.values(translations).find(
			(item): item is string => typeof item === "string",
		) ?? ""
	);
};

const getDocumentFieldValue = (
	reference: DocumentRef,
	fieldKey: string,
	locale: string,
): string | number | boolean | null => {
	const field = reference.fields?.[fieldKey];
	const fieldRecord = getObject(field);
	let value: unknown = field;

	if (
		fieldRecord &&
		("value" in fieldRecord || "translations" in fieldRecord)
	) {
		const translations = getObject(fieldRecord.translations);
		value = translations
			? (translations[locale] ?? fieldRecord.value)
			: fieldRecord.value;
	} else if (fieldRecord) {
		value =
			fieldRecord[locale] ??
			Object.values(fieldRecord).find((item) => item !== undefined);
	}

	return typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
		? value
		: null;
};

const getMediaRenderData = (
	reference: Media,
	locale: string,
): RichTextHydratedMedia | null => {
	if (reference.type === "image") {
		return {
			type: "image",
			src: reference.file.url,
			alt:
				getLocalizedString(reference.alt, locale) ||
				getLocalizedString(reference.title, locale),
		};
	}
	if (reference.type === "audio") {
		return { type: "audio", src: reference.file.url };
	}
	if (reference.type === "video") {
		return {
			type: "video",
			src: reference.file.url,
			poster: reference.poster?.file.url ?? null,
		};
	}

	return null;
};

/** Adds response-only render values while preserving each reference identity. */
const hydrateRichTextValue = (
	value: RichTextJSON,
	context: CustomFieldResponseFormatContext,
): RichTextJSON => {
	const documents = (context.refs?.relation ?? []).filter(isDocumentRef);
	const media = (context.refs?.media ?? []).filter(isMediaRef);
	const documentMap = new Map(
		documents.map((reference) => [
			`${reference.collectionKey}\0${reference.id}`,
			reference,
		]),
	);
	const mediaMap = new Map(media.map((reference) => [reference.id, reference]));

	const visit = (node: RichTextJSON): RichTextJSON => {
		const attrs = { ...node.attrs };

		if (node.type === "lucidMedia") {
			const reference =
				typeof attrs.mediaId === "number"
					? mediaMap.get(attrs.mediaId)
					: undefined;
			attrs.media = reference
				? getMediaRenderData(reference, context.locale)
				: null;
		}

		if (node.type === "lucidVariable") {
			const reference =
				typeof attrs.collectionKey === "string" &&
				typeof attrs.documentId === "number"
					? documentMap.get(`${attrs.collectionKey}\0${attrs.documentId}`)
					: undefined;
			attrs.value =
				reference && typeof attrs.fieldKey === "string"
					? getDocumentFieldValue(reference, attrs.fieldKey, context.locale)
					: null;
		}

		return {
			...node,
			...(node.attrs ? { attrs } : {}),
			...(node.content ? { content: node.content.map(visit) } : {}),
			...(node.marks
				? {
						marks: node.marks.map((mark) => {
							if (mark.type !== "link" || mark.attrs?.kind !== "document") {
								return mark;
							}

							const markAttrs = { ...mark.attrs };
							const reference =
								typeof markAttrs.collectionKey === "string" &&
								typeof markAttrs.documentId === "number"
									? documentMap.get(
											`${markAttrs.collectionKey}\0${markAttrs.documentId}`,
										)
									: undefined;
							const path = reference?.route?.path;
							markAttrs.href =
								typeof path === "string"
									? path
									: getLocalizedString(path, context.locale) || null;
							return { ...mark, attrs: markAttrs };
						}),
					}
				: {}),
		};
	};

	return visit(value);
};

export default hydrateRichTextValue;
