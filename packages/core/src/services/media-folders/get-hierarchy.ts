import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { MediaFolderResponse } from "../../types/response.js";
import buildHierarchy from "./helpers/build-hierachy.js";

const getHierarchy: ServiceFn<[], MediaFolderResponse[]> = async (context) => {
	const MediaFolders = Repository.get(
		"media-folders",
		context.db,
		context.config.db,
	);
	const MediaFoldersFormatter = Formatter.get("media-folders");

	const foldersRes = await MediaFolders.selectMultiple({
		select: [
			"id",
			"title",
			"parent_folder_id",
			"created_by",
			"updated_by",
			"created_at",
			"updated_at",
		],
		validation: {
			enabled: true,
		},
	});
	if (foldersRes.error) return foldersRes;

	const hierarchicalFolders = buildHierarchy(foldersRes.data);

	return {
		error: undefined,
		data: MediaFoldersFormatter.formatMultiple({
			folders: hierarchicalFolders,
		}),
	};
};

export default getHierarchy;
