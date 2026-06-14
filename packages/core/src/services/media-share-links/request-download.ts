import { MediaRepository } from "../../libs/repositories/index.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import { resolveMediaKeyTenant } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";

const requestDownload: ServiceFn<
	[
		{
			mediaKey: string;
		},
	],
	{
		url: string;
	}
> = async (context, data) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;
	const Media = new MediaRepository(context.db.client, context.config.db);

	const mediaRes = await Media.selectSingle({
		select: ["file_name", "file_extension"],
		where: [
			{
				key: "key",
				operator: "=",
				value: data.mediaKey,
			},
		],
	});
	if (mediaRes.error) return mediaRes;

	const downloadUrlRes = await mediaStrategyRes.data.getDownloadUrl({
		key: data.mediaKey,
		meta: {
			host: getBaseUrl(context),
			secretKey: context.config.secrets.cookie,
			fileName: mediaRes.data?.file_name,
			extension: mediaRes.data?.file_extension,
		},
		context: {
			tenant: resolveMediaKeyTenant(context.config, data.mediaKey),
		},
	});
	if (downloadUrlRes.error) return downloadUrlRes;

	return {
		error: undefined,
		data: {
			url: downloadUrlRes.data.url,
		},
	};
};

export default requestDownload;
