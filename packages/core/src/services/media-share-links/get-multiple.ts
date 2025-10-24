import Formatter from "../../libs/formatters/index.js";
import Repository from "../../libs/repositories/index.js";
import type { GetMultipleShareLinksQueryParams } from "../../schemas/media-share-links.js";
import type { MediaShareLinkResponse } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getMultiple: ServiceFn<
	[
		{
			mediaId: number;
			query: GetMultipleShareLinksQueryParams;
		},
	],
	{
		data: MediaShareLinkResponse[];
		count: number;
	}
> = async (context, data) => {
	const MediaShareLinks = Repository.get(
		"media-share-links",
		context.db,
		context.config.db,
	);
	const formatter = Formatter.get("media-share-links");

	const linksRes = await MediaShareLinks.selectMultipleFiltered({
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
		where: [{ key: "media_id", operator: "=", value: data.mediaId }],
		queryParams: data.query,
		validation: {
			enabled: true,
		},
	});
	if (linksRes.error) return linksRes;

	return {
		error: undefined,
		data: {
			data: formatter.formatMultiple({
				links: linksRes.data[0],
				host: context.config.host,
			}),
			count: Formatter.parseCount(linksRes.data[1]?.count),
		},
	};
};

export default getMultiple;
