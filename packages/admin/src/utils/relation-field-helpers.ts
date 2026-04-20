import type {
	DocumentRef,
	InternalCollectionDocument,
	Media,
	MediaRef,
	User,
	UserRef,
} from "@types";
import brickHelpers from "@/utils/brick-helpers";

export type MediaRelationRef = NonNullable<MediaRef>;
export type UserRelationRef = NonNullable<UserRef>;

export const mediaResponseToRef = (media: Media): MediaRelationRef => ({
	id: media.id,
	url: media.url,
	key: media.key,
	mimeType: media.meta.mimeType,
	extension: media.meta.extension,
	fileSize: media.meta.fileSize,
	type: media.type,
	width: media.meta.width ?? null,
	height: media.meta.height ?? null,
	blurHash: media.meta.blurHash ?? null,
	averageColor: media.meta.averageColor ?? null,
	isDark: media.meta.isDark ?? null,
	isLight: media.meta.isLight ?? null,
	title: media.title.reduce<Record<string, string>>((acc, t) => {
		if (!t.localeCode) return acc;
		acc[t.localeCode] = t.value ?? "";
		return acc;
	}, {}),
	alt: media.alt.reduce<Record<string, string>>((acc, t) => {
		if (!t.localeCode) return acc;
		acc[t.localeCode] = t.value ?? "";
		return acc;
	}, {}),
	isDeleted: media.isDeleted ?? false,
	public: media.public,
});

export const userResponseToRef = (user: User): UserRelationRef => ({
	id: user.id,
	username: user.username,
	email: user.email,
	firstName: user.firstName,
	lastName: user.lastName,
});

/**
 * Converts a document response into the ref shape stored by relation fields in
 * the page builder.
 */
export const documentResponseToRef = (
	doc: InternalCollectionDocument,
): DocumentRef => ({
	id: doc.id,
	collectionKey: doc.collectionKey,
	fields: doc.fields ? brickHelpers.objectifyFields(doc.fields) : null,
});
