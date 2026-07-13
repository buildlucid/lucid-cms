import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { MediaRepository } from "../../../libs/repositories/index.js";
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
						message: copy("server:core.media.poster.cannot.reference.self"),
					},
				},
			},
			data: undefined,
		};
	}

	const Media = new MediaRepository(context.db.client, context.config.db);

	const posterRes = await Media.selectSingleById({
		id: data.posterId,
		tenantKey: context.request.tenantKey,
		includeOwned: data.parentId !== undefined,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.media.poster.not.found"),
				status: 404,
			},
		},
	});
	if (posterRes.error) return posterRes;
	if (
		posterRes.data.parent_media_id !== null &&
		!(
			posterRes.data.relation_type === "poster" &&
			posterRes.data.parent_media_id === data.parentId
		)
	) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.media.poster.not.found"),
			},
			data: undefined,
		};
	}

	if (posterRes.data.type !== "image") {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					posterId: {
						code: "media_error",
						message: copy("server:core.media.poster.must.be.image"),
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
						message: copy("server:core.media.poster.not.found"),
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
