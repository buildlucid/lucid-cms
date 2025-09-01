import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { OptionsName } from "../../schemas/options.js";

const upsertSingle: ServiceFn<
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
	const Options = Repository.get("options", context.db, context.config.db);

	const upsertRes = await Options.upsertSingle({
		data: {
			name: data.name,
			value_text: data.valueText ?? null,
			value_int: data.valueInt ?? null,
			value_bool: data.valueBool ?? null,
		},
		returning: ["name"],
		validation: {
			enabled: true,
		},
	});
	if (upsertRes.error) return upsertRes;

	return { error: undefined, data: undefined };
};

export default upsertSingle;
