import { copy } from "../../libs/i18n/index.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import updateSingle from "./update-single.js";

type Translations = { localeCode: string | null; value: string | null }[];

/**
 * Removes ownership of personal media so it joins the shared media library,
 * such as a chat upload that should appear on a page. Only its owner can do this, and
 * it's private unless `public` is set.
 */
const removeOwnership: ServiceFn<
	[
		{
			id: number;
			userId: number;
			public: boolean;
			folderId?: number | null;
			title?: Translations;
			alt?: Translations;
		},
	],
	number
> = async (context, data) => {
	const Media = new MediaRepository(context.db);

	const mediaRes = await Media.selectSingle({
		select: ["owner_user_id"],
		where: [
			{ key: "id", operator: "=", value: data.id },
			{ key: "parent_media_id", operator: "is", value: null },
		],
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.media.not.found.message"),
				status: 404,
			},
		},
	});
	if (mediaRes.error) return mediaRes;

	if (mediaRes.data.owner_user_id !== data.userId) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.media.personal.not.owner"),
				status: 403,
			},
			data: undefined,
		};
	}

	return updateSingle(context, {
		id: data.id,
		removeOwnership: true,
		public: data.public,
		folderId: data.folderId,
		title: data.title,
		alt: data.alt,
		actor: { type: "internal" },
		userId: data.userId,
	});
};

export default removeOwnership;
