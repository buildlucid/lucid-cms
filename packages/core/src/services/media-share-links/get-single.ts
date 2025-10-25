import Formatter from "../../libs/formatters/index.js";
import Repository from "../../libs/repositories/index.js";
import type { MediaShareLinkResponse } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getSingle: ServiceFn<
	[
		{
			mediaId: number;
			linkId: number;
		},
	],
	MediaShareLinkResponse
> = async (context, data) => {
	const MediaShareLinks = Repository.get(
		"media-share-links",
		context.db,
		context.config.db,
	);
	const formatter = Formatter.get("media-share-links");

	const linkRes = await MediaShareLinks.selectSingle({
		select: [
			"id",
			"media_id",
			"token",
			"password",
			"expires_at",
			"name",
			"description",
			"created_at",
			"updated_at",
			"created_by",
			"updated_by",
		],
		where: [
			{ key: "media_id", operator: "=", value: data.mediaId },
			{ key: "id", operator: "=", value: data.linkId },
		],
		validation: {
			enabled: true,
		},
	});
	if (linkRes.error) return linkRes;

	return {
		error: undefined,
		data: formatter.formatSingle({
			link: linkRes.data,
			host: context.config.host,
		}),
	};
};

export default getSingle;
