import { copy } from "../../libs/i18n/index.js";
import { MediaFoldersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkFolderAccess from "./checks/check-folder-access.js";
import checkFolderOwnership from "./checks/check-folder-ownership.js";

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
		context.db.client,
		context.config.db,
	);

	if (data.parentFolderId === data.id) {
		return {
			error: {
				message: copy("server:core.media.folders.parents.circular"),
				status: 400,
				errors: {
					fields: [
						{
							key: "parentFolderId",
							message: copy("server:core.media.folders.parents.circular"),
						},
					],
				},
			},
			data: undefined,
		};
	}

	const folderAccessRes = await checkFolderOwnership(context, {
		folderId: data.id,
	});
	if (folderAccessRes.error) return folderAccessRes;

	const parentFolderAccessRes = await checkFolderAccess(context, {
		folderId: data.parentFolderId,
	});
	if (parentFolderAccessRes.error) return parentFolderAccessRes;

	if (data.parentFolderId) {
		const circularParentsRes = await MediaFolders.checkCircularParents({
			folderId: data.id,
			parentFolderId: data.parentFolderId,
			tenantKey: context.request.tenantKey,
		});
		if (circularParentsRes.error) return circularParentsRes;

		if (circularParentsRes.data) {
			return {
				error: {
					message: copy("server:core.media.folders.parents.circular"),
					status: 400,
					errors: {
						fields: [
							{
								key: "parentFolderId",
								message: copy("server:core.media.folders.parents.circular"),
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
			{
				key: "tenant_key",
				operator: "=",
				value: context.request.tenantKey ?? null,
				condition: context.request.tenantKey != null,
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
