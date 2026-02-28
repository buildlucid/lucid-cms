import T from "../../../translations/index.js";
import { formatBytes } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const checkCanUpdateMedia: ServiceFn<
	[
		{
			size: number;
		},
	],
	undefined
> = async (context, data) => {
	const maxFileSize = context.config.media.limits.fileSize;

	if (data.size > maxFileSize) {
		return {
			error: {
				type: "basic",
				message: T("file_too_large_max_size_is", {
					size: formatBytes(maxFileSize),
				}),
				status: 500,
				errors: {
					file: {
						code: "storage",
						message: T("file_too_large_max_size_is", {
							size: formatBytes(maxFileSize),
						}),
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

export default checkCanUpdateMedia;
