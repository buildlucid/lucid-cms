import formatter from "../../../libs/formatters/helpers.js";
import { formatFocalPoint } from "../../../libs/formatters/media.js";
import { copy } from "../../../libs/i18n/index.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import { MediaRepository } from "../../../libs/repositories/index.js";
import type { TransferExportProps } from "../../../libs/transfer/types.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import createMediaUrl from "../../../utils/media/create-media-url.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveActorUser from "../../users/helpers/resolve-actor-user.js";
import { mediaTextFields } from "../helpers/text-fields.js";
import getFolderPath from "./helpers/get-folder-path.js";
import type { MediaEntry } from "./schema.js";

/**
 * Exports library media with the details an upload can't work out from the file, and the URL the file is served from.
 * @remarks Media linked from exported documents only needs document access, as editors can already see it there.
 */
const exportMedia: ServiceFn<[TransferExportProps], MediaEntry[]> = async (
	context,
	props,
) => {
	if (!props.linked) {
		const userRes = await resolveActorUser(context, { actor: props.actor });
		if (userRes.error) return userRes;
		if (
			!hasAccess({
				user: userRes.data,
				optionalPermissions: [Permissions.MediaRead, Permissions.MediaReadAll],
			})
		) {
			return {
				error: {
					status: 403,
					message: copy("server:core.transfer.media.export.permission"),
				},
				data: undefined,
			};
		}
	}

	const ids = props.ids.map(Number).filter(Number.isInteger);
	if (ids.length === 0) return { error: undefined, data: [] };

	const Media = new MediaRepository(context.db);
	const mediaRes = await Media.selectMultipleByIds({
		ids,
		validation: { enabled: true },
	});
	if (mediaRes.error) return mediaRes;

	const folders = new Map<number, string[]>();
	const entries: MediaEntry[] = [];
	for (const media of mediaRes.data) {
		if (
			media.owner_user_id !== null ||
			formatter.formatBoolean(media.is_system)
		) {
			continue;
		}

		let folder: string[] = [];
		if (media.folder_id !== null) {
			const cached = folders.get(media.folder_id);
			if (cached) folder = cached;
			else {
				const pathRes = await getFolderPath(context, {
					folderId: media.folder_id,
				});
				if (pathRes.error) return pathRes;

				folder = pathRes.data;
				folders.set(media.folder_id, folder);
			}
		}

		const text: MediaEntry["text"] = {};
		for (const field of ["title", ...mediaTextFields[media.type]] as const) {
			for (const translation of media.translations ?? []) {
				const value = translation[field];
				if (value === null || value === undefined) continue;

				text[field] = [
					...(text[field] ?? []),
					{ localeCode: translation.locale_code, value },
				];
			}
		}

		const fileName =
			media.file_name ??
			(media.file_extension
				? `${media.uid}.${media.file_extension}`
				: media.uid);
		entries.push({
			uid: media.uid,
			fileName,
			mimeType: media.mime_type,
			type: media.type,
			size: media.file_size,
			public: formatter.formatBoolean(media.public),
			folder,
			meta: {
				width: media.width,
				height: media.height,
				duration: media.duration,
				focalPoint: formatFocalPoint(media.focal_x, media.focal_y),
				blurHash: media.blur_hash,
				averageColor: media.average_color,
				base64: media.base64,
				isDark: formatter.formatBoolean(media.is_dark),
				isLight: formatter.formatBoolean(media.is_light),
			},
			text,
			url: createMediaUrl({
				key: media.key,
				host: getBaseUrl(context),
				fileName: media.file_name,
				extension: media.file_extension,
			}),
		});
	}

	return { error: undefined, data: entries };
};

export default exportMedia;
