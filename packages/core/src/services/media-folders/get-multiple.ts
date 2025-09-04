import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { MultipleMediaFolderResponse } from "../../types/response.js";
import type { GetMultipleQueryParams } from "../../schemas/media-folders.js";

const getMultiple: ServiceFn<
	[
		{
			query: GetMultipleQueryParams;
		},
	],
	{
		data: MultipleMediaFolderResponse;
		count: number;
	}
> = async (context, data) => {
	const MediaFolders = Repository.get(
		"media-folders",
		context.db,
		context.config.db,
	);
	const MediaFoldersFormatter = Formatter.get("media-folders");

	const parentFolderId = data.query.filter?.parentFolderId?.value;
	const parsedId = parentFolderId ? Number(parentFolderId) : undefined;
	const searchBreadcrumbs = parsedId && !Number.isNaN(parsedId);

	const [foldersRes, breadcrumbsRes] = await Promise.all([
		MediaFolders.selectMultipleFiltered({
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
		}),
		searchBreadcrumbs
			? MediaFolders.getBreadcrumb({
					folderId: parsedId,
				})
			: undefined,
	]);
	if (foldersRes.error) return foldersRes;
	if (breadcrumbsRes?.error) return breadcrumbsRes;

	return {
		error: undefined,
		data: {
			data: {
				breadcrumbs: MediaFoldersFormatter.formatBreadcrumbs({
					breadcrumbs: breadcrumbsRes?.data ?? [],
				}),
				folders: MediaFoldersFormatter.formatMultiple({
					folders: foldersRes.data[0],
				}),
			},
			count: Formatter.parseCount(foldersRes.data[1]?.count),
		},
	};
};

export default getMultiple;
