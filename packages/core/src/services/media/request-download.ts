import { MediaRepository } from "../../libs/repositories/index.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkHasMediaStorage from "./checks/check-has-media-storage.js";

const requestDownload: ServiceFn<
	[
		{
			target:
				| {
						type: "id";
						id: number;
				  }
				| {
						type: "key";
						key: string;
				  };
		},
	],
	{
		url: string;
	}
> = async (context, data) => {
	const mediaStorageRes = await checkHasMediaStorage(context);
	if (mediaStorageRes.error) return mediaStorageRes;

	const Media = new MediaRepository(context.db);

	const getDownloadUrl = async (media: {
		key: string;
		file_name: string | null;
		file_extension: string;
	}) => {
		const downloadUrlRes = await mediaStorageRes.data.getDownloadUrl(context, {
			key: media.key,
			host: getBaseUrl(context),
			secretKey: context.config.secrets.cookie,
			fileName: media.file_name,
			extension: media.file_extension,
		});
		if (downloadUrlRes.error) return downloadUrlRes;

		return {
			error: undefined,
			data: {
				url: downloadUrlRes.data.url,
			},
		};
	};

	if (data.target.type === "id") {
		const mediaRes = await Media.selectSingleById({
			id: data.target.id,
			validation: { enabled: true },
		});
		if (mediaRes.error) return mediaRes;

		return getDownloadUrl(mediaRes.data.crop?.[0] ?? mediaRes.data);
	}

	const mediaRes = await Media.selectSingle({
		select: ["key", "file_name", "file_extension"],
		where: [
			{
				key: "key",
				operator: "=",
				value: data.target.key,
			},
		],
		validation: { enabled: true },
	});
	if (mediaRes.error) return mediaRes;

	return getDownloadUrl(mediaRes.data);
};

export default requestDownload;
