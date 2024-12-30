import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { MediaResponse } from "../../types/response.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	MediaResponse
> = async (context, data) => {
	const MediaRepo = Repository.get("media", context.db, context.config.db);
	const MediaFormatter = Formatter.get("media");

	const media = await MediaRepo.selectSingleById({
		id: data.id,
		config: context.config,
	});

	if (media === undefined) {
		return {
			error: {
				type: "basic",
				message: T("media_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: MediaFormatter.formatSingle({
			media: media,
			host: context.config.host,
		}),
	};
};

export default getSingle;
