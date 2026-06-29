import type {
	DocumentRef,
	InternalCollectionDocument,
	Media,
	MediaRef,
	User,
	UserRef,
} from "@types";
import brickHelpers from "@/utils/brick-helpers";
import { isObjectRecord } from "@/utils/type-guards";

export type MediaRelationRef = NonNullable<MediaRef>;
export type UserRelationRef = NonNullable<UserRef>;

export const isDocumentRef = (value: unknown): value is DocumentRef => {
	return (
		isObjectRecord(value) &&
		typeof value.id === "number" &&
		typeof value.collectionKey === "string" &&
		"fields" in value
	);
};

export const isUserRef = (value: unknown): value is UserRelationRef => {
	return (
		isObjectRecord(value) &&
		typeof value.id === "number" &&
		"username" in value &&
		"email" in value &&
		"firstName" in value &&
		"lastName" in value &&
		"profilePicture" in value
	);
};

export const mediaResponseToRef = (media: Media): MediaRelationRef => media;

export const userResponseToRef = (user: User): UserRelationRef => ({
	id: user.id,
	username: user.username,
	email: user.email,
	firstName: user.firstName,
	lastName: user.lastName,
	profilePicture: user.profilePicture,
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
