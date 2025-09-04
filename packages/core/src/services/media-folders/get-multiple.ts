import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { MediaFolderResponse } from "../../types/response.js";
import type { GetMultipleQueryParams } from "../../schemas/media-folders.js";

const getMultiple: ServiceFn<
	[
		{
			query: GetMultipleQueryParams;
		},
	],
	{
		data: MediaFolderResponse[];
		count: number;
	}
> = async (context, data) => {
	const MediaFolders = Repository.get(
		"media-folders",
		context.db,
		context.config.db,
	);
	const MediaFoldersFormatter = Formatter.get("media-folders");

	const foldersRes = await MediaFolders.selectMultipleFiltered({
		select: [
			"id",
			"title",
			"parent_folder_id",
			"created_by",
			"updated_by",
			"created_at",
			"updated_at",
		],
		queryParams: data.query,
		validation: {
			enabled: true,
		},
	});
	if (foldersRes.error) return foldersRes;

	return {
		error: undefined,
		data: {
			data: MediaFoldersFormatter.formatMultiple({
				folders: foldersRes.data[0],
			}),
			count: Formatter.parseCount(foldersRes.data[1]?.count),
		},
	};
};

export default getMultiple;
