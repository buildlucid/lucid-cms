import type {
	Media,
	MediaListItem,
	ProfilePicture,
} from "@lucidcms/core/types";
import isRecord from "../utils/is-record.js";

const mediaText = [
	"title",
	"alt",
	"description",
	"summary",
	"transcript",
] as const;
const mediaTextKeys = new Set<string>(mediaText);

/** Media text, such as `alt`, in one locale, including a video poster's. */
export type LocalizedMedia<Item> = {
	[Key in keyof Item]: Key extends (typeof mediaText)[number]
		? string | null
		: Key extends "poster"
			? LocalizedMedia<NonNullable<Item[Key]>> | Extract<Item[Key], null>
			: Item[Key];
};

/** A media item as the content API returns it, with its text in the render's locale. */
export type TemplateMedia = LocalizedMedia<Media | MediaListItem>;

const toText = (value: unknown, locale: string) => {
	if (typeof value === "string") return value;
	if (isRecord(value)) {
		const text = value[locale];
		return typeof text === "string" ? text : null;
	}
	return null;
};

const localize = (record: object, locale: string): Record<string, unknown> =>
	Object.fromEntries(
		Object.entries(record).map(([key, value]) => {
			if (mediaTextKeys.has(key)) return [key, toText(value, locale)];
			if (key === "poster" && isRecord(value)) {
				return [key, localize(value, locale)];
			}
			return [key, value];
		}),
	);

/** Gives media, or a media preview such as a profile picture, its text in the locale. */
const toTemplateMedia = <Item extends Media | MediaListItem | ProfilePicture>(
	media: Item,
	locale: string,
): LocalizedMedia<Item> =>
	// The runtime shape is untyped; `LocalizedMedia` describes what `localize` produced.
	localize(media, locale) as LocalizedMedia<Item>;

export default toTemplateMedia;
