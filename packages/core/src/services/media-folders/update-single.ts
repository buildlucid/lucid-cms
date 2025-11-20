import { MediaFoldersRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const updateSingle: ServiceFn<
	[
		{
			id: number;
			title?: string;
			parentFolderId?: number | null;
			userId: number;
		},
	],
	number
> = async (context, data) => {
	const MediaFolders = new MediaFoldersRepository(
		context.db,
		context.config.db,
	);

	if (data.parentFolderId === data.id) {
		return {
			error: {
				message: T("circular_media_folder_parents_error_message"),
				status: 400,
				errors: {
					fields: [
						{
							key: "parentFolderId",
							message: T("circular_media_folder_parents_error_message"),
						},
					],
				},
			},
			data: undefined,
		};
	}

	if (data.parentFolderId) {
		const circularParentsRes = await MediaFolders.checkCircularParents({
			folderId: data.id,
			parentFolderId: data.parentFolderId,
		});
		if (circularParentsRes.error) return circularParentsRes;

		if (circularParentsRes.data) {
			return {
				error: {
					message: T("circular_media_folder_parents_error_message"),
					status: 400,
					errors: {
						fields: [
							{
								key: "parentFolderId",
								message: T("circular_media_folder_parents_error_message"),
							},
						],
					},
				},
				data: undefined,
			};
		}
	}

	const updateMediaFolderRes = await MediaFolders.updateSingle({
		data: {
			title: data.title,
			parent_folder_id: data.parentFolderId,
			updated_by: data.userId,
			updated_at: new Date().toISOString(),
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (updateMediaFolderRes.error) return updateMediaFolderRes;

	return {
		error: undefined,
		data: updateMediaFolderRes.data.id,
	};
};

export default updateSingle;
