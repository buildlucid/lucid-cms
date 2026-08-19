import type { ServiceFn } from "../../../utils/services/types.js";
import checkHasMediaStorage from "../checks/check-has-media-storage.js";

const rename: ServiceFn<
	[
		{
			from: string;
			to: string;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStorageRes = await checkHasMediaStorage(context);
	if (mediaStorageRes.error) return mediaStorageRes;

	const res = await mediaStorageRes.data.rename(context, {
		from: data.from,
		to: data.to,
	});
	if (res.error) {
		return {
			error: {
				type: "basic",
				status: 500,
				errors: {
					file: {
						code: "media_error",
						message: res.error.message,
					},
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default rename;
