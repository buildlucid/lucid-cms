import { OptionsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { OptionsName } from "../../schemas/options.js";

const updateSingle: ServiceFn<
	[
		{
			name: OptionsName;
			valueText?: string | null;
			valueInt?: number | null;
			valueBool?: boolean | null;
		},
	],
	undefined
> = async (context, data) => {
	const Options = new OptionsRepository(context.db, context.config.db);

	const updateOptionRes = await Options.updateSingle({
		where: [
			{
				key: "name",
				operator: "=",
				value: data.name,
			},
		],
		data: {
			value_bool: data.valueBool,
			value_int: data.valueInt,
			value_text: data.valueText,
		},
		returning: ["name"],
		validation: {
			enabled: true,
		},
	});
	if (updateOptionRes.error) return updateOptionRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateSingle;
