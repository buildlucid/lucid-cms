import type { ServiceFn } from "../../../utils/services/types.js";
import { mediaServices } from "../../index.js";

const rename: ServiceFn<
	[
		{
			from: string;
			to: string;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const res = await mediaStrategyRes.data.services.rename({
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
