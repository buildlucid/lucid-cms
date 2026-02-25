import { MediaRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";

const deleteMultiplePermanently: ServiceFn<
	[
		{
			ids: number[];
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	if (!data.ids || data.ids.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Media = new MediaRepository(context.db.client, context.config.db);

	const existRes = await Media.selectMultiple({
		select: ["id"],
		where: [
			{
				key: "id",
				operator: "in",
				value: data.ids,
			},
		],
		validation: { enabled: true },
	});
	if (existRes.error) return existRes;

	const existing = new Set(existRes.data.map((r) => r.id));
	const missing = data.ids.filter((id) => !existing.has(id));
	if (missing.length > 0) {
		return {
			error: {
				type: "basic",
				message: T("media_not_found_message"),
				errors: {
					ids: {
						message: T("only_found_ids_error_message", {
							ids: existRes.data.map((m) => m.id).join(", "),
						}),
					},
				},
				status: 404,
			},
			data: undefined,
		};
	}

	for (const id of data.ids) {
		const deleteRes = await mediaServices.deleteSinglePermanently(context, {
			id,
			userId: data.userId,
		});
		if (deleteRes.error) return deleteRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteMultiplePermanently;
