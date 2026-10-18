import type { ProfilePicture, Refs } from "@lucidcms/core/types";
import toTemplateMedia, { type LocalizedMedia } from "./to-template-media.js";

type UserRef = NonNullable<Refs["users"]>[number];

/** A user a user field points to, as the content API returns them, with their profile picture's text in the locale. */
export type TemplateUser = Omit<UserRef, "profilePicture"> & {
	profilePicture: LocalizedMedia<ProfilePicture> | null;
};

const toTemplateUser = (user: UserRef, locale: string): TemplateUser => ({
	...user,
	profilePicture: user.profilePicture
		? toTemplateMedia(user.profilePicture, locale)
		: null,
});

export default toTemplateUser;
