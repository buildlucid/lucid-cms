import { OptionsRepository } from "../../libs/repositories/index.js";
import type { OptionsName } from "../../schemas/options.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const adjustInt: ServiceFn<
	[
		{
			name: OptionsName;
			delta: number;
			max?: number;
			min?: number;
		},
	],
	{
		applied: boolean;
	}
> = async (context, data) => {
	const Options = new OptionsRepository(context.db.client, context.config.db);

	const updateRes = await Options.adjustInt({
		data: {
			name: data.name,
			delta: data.delta,
			max: data.max,
			min: data.min,
		},
		validation: {
			enabled: true,
		},
	});
	if (updateRes.error) return updateRes;

	const updatedRows = Number(updateRes.data.count);
	if (updatedRows === 0) {
		if (data.max === undefined || data.delta <= 0) {
			return {
				error: {
					type: "basic",
					message: T("option_not_found_message"),
					status: 404,
				},
				data: undefined,
			};
		}
		return {
			error: undefined,
			data: {
				applied: false,
			},
		};
	}

	return {
		error: undefined,
		data: {
			applied: true,
		},
	};
};

export default adjustInt;
