import { getBaseUrl } from "../../utils/helpers/index.js";
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

	const downloadUrlRes = await mediaStrategyRes.data.getDownloadUrl(
		data.mediaKey,
		{
			host: getBaseUrl(context),
		},
	);
	if (downloadUrlRes.error) return downloadUrlRes;

	return {
		error: undefined,
		data: {
			url: downloadUrlRes.data.url,
		},
	};
};

export default requestDownload;
