import { optionsFormatter } from "../../libs/formatters/index.js";
import { OptionsRepository } from "../../libs/repositories/index.js";
import type { OptionsName } from "../../schemas/options.js";
import T from "../../translations/index.js";
import type { OptionsResponse } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getSingle: ServiceFn<
	[
		{
			name: OptionsName;
		},
	],
	OptionsResponse
> = async (context, data) => {
	const Options = new OptionsRepository(context.db, context.config.db);

	const optionRes = await Options.selectSingle({
		select: ["name", "value_bool", "value_int", "value_text"],
		where: [
			{
				key: "name",
				operator: "=",
				value: data.name,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				message: T("option_not_found_message"),
				status: 404,
			},
		},
	});
	if (optionRes.error) return optionRes;

	return {
		error: undefined,
		data: optionsFormatter.formatSingle({
			option: optionRes.data,
		}),
	};
};

export default getSingle;
