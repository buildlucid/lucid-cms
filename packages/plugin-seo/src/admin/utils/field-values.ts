import type { FieldRefByType, FieldScope } from "@lucidcms/admin/types";

export type SeoImage = Extract<FieldRefByType["media"], { type: "image" }>;

/** A text field's value in the content locale, or an empty string. */
export const readText = (fields: FieldScope, key: string) => {
	const value = fields.get(key)?.value;
	return typeof value === "string" ? value : "";
};

/** Whether a media field links to anything, before its display data loads. */
export const hasMedia = (fields: FieldScope, key: string) =>
	(fields.get(key, "media")?.value?.length ?? 0) > 0;

/** The image a media field links to, once its display data has loaded. */
export const readImage = (
	fields: FieldScope,
	key: string,
): SeoImage | undefined => {
	const media = fields.get(key, "media")?.refs[0];
	return media?.type === "image" ? media : undefined;
};

/** An image's alt text in a locale. */
export const readAlt = (image: SeoImage | undefined, locale: string) => {
	const alt = image?.alt;
	return typeof alt === "string" ? alt : (alt?.[locale] ?? "");
};
