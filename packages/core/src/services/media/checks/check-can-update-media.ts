import { copy } from "../../../libs/i18n/index.js";
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
	const maxFileSize = context.config.media.limits.uploadBytes;

	if (data.size > maxFileSize) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.files.validation.size.limit.exceeded", {
					data: {
						size: formatBytes(maxFileSize),
					},
				}),
				status: 500,
				errors: {
					file: {
						code: "storage",
						message: copy("server:core.files.validation.size.limit.exceeded", {
							data: {
								size: formatBytes(maxFileSize),
							},
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
