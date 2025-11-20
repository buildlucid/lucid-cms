import { MediaFoldersRepository } from "../../libs/repositories/index.js";
import { mediaFoldersFormatter } from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { MediaFolderResponse } from "../../types/response.js";
import buildHierarchy from "./helpers/build-hierachy.js";

const getHierarchy: ServiceFn<[], MediaFolderResponse[]> = async (context) => {
	const MediaFolders = new MediaFoldersRepository(
		context.db,
		context.config.db,
	);

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
		data: mediaFoldersFormatter.formatMultiple({
			folders: hierarchicalFolders,
		}),
	};
};

export default getHierarchy;
