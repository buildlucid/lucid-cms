import formatter from "../../../libs/formatters/index.js";
import { MediaRepository } from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const resolvePoster: ServiceFn<
	[
		{
			posterId: number;
			parentId?: number;
		},
	],
	{
		id: number;
	}
> = async (context, data) => {
	if (data.parentId !== undefined && data.posterId === data.parentId) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					posterId: {
						code: "media_error",
						message: T("media_poster_cannot_reference_self"),
					},
				},
			},
			data: undefined,
		};
	}

	const Media = new MediaRepository(context.db.client, context.config.db);

	const posterRes = await Media.selectSingle({
		select: ["id", "type", "is_deleted"],
		where: [{ key: "id", operator: "=", value: data.posterId }],
		validation: {
			enabled: true,
			defaultError: {
				message: T("media_poster_not_found"),
				status: 404,
			},
		},
	});
	if (posterRes.error) return posterRes;

	if (posterRes.data.type !== "image") {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					posterId: {
						code: "media_error",
						message: T("media_poster_must_be_image"),
					},
				},
			},
			data: undefined,
		};
	}

	if (formatter.formatBoolean(posterRes.data.is_deleted)) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					posterId: {
						code: "media_error",
						message: T("media_poster_not_found"),
					},
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			id: posterRes.data.id,
		},
	};
};

export default resolvePoster;
