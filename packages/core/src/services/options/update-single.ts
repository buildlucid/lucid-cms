import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { OptionName } from "../../types/response.js";

const updateSingle: ServiceFn<
	[
		{
			name: OptionName;
			valueText?: string;
			valueInt?: number;
			valueBool?: boolean;
		},
	],
	undefined
> = async (context, data) => {
	const Options = Repository.get("options", context.db, context.config.db);

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
