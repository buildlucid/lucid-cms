import { MediaFoldersRepository } from "../../libs/repositories/index.js";
import formatter, {
	mediaFoldersFormatter,
} from "../../libs/formatters/index.js";
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
	const MediaFolders = new MediaFoldersRepository(
		context.db,
		context.config.db,
	);

	const parentFolderId = data.query.filter?.parentFolderId?.value;
	const parsedId = parentFolderId ? Number(parentFolderId) : undefined;
	const searchBreadcrumbs = parsedId && !Number.isNaN(parsedId);

	const [foldersRes, breadcrumbsRes] = await Promise.all([
		MediaFolders.selectMultipleWithCounts({
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
				breadcrumbs: mediaFoldersFormatter.formatBreadcrumbs({
					breadcrumbs: breadcrumbsRes?.data ?? [],
				}),
				folders: mediaFoldersFormatter.formatMultiple({
					folders: foldersRes.data[0],
				}),
			},
			count: formatter.parseCount(foldersRes.data[1]?.count),
		},
	};
};

export default getMultiple;
