import type {
	DocumentRef,
	Email,
	EmailRef,
	InternalCollectionDocument,
	Media,
	MediaRef,
	User,
	UserRef,
} from "@types";
import brickHelpers from "@/utils/brick-helpers";

export type MediaRelationRef = NonNullable<MediaRef>;
export type UserRelationRef = NonNullable<UserRef>;

export const mediaResponseToRef = (media: Media): MediaRelationRef => media;

export const emailResponseToRef = (email: Email): EmailRef => ({
	id: email.id,
	subject: email.mailDetails.subject,
	template: email.mailDetails.template,
	from: email.mailDetails.from,
	to: email.mailDetails.to,
	cc: email.mailDetails.cc,
	bcc: email.mailDetails.bcc,
	currentStatus: email.currentStatus,
	createdAt: email.createdAt,
});

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
	route: doc.route,
	fields: doc.fields ? brickHelpers.objectifyFields(doc.fields) : null,
});
