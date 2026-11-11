import { copy } from "../../libs/i18n/index.js";
import { OptionsRepository } from "../../libs/repositories/index.js";
import type { OptionsName } from "../../schemas/options.js";
import type { ServiceFn } from "../../utils/services/types.js";

const adjustInt: ServiceFn<
	[
		{
			name: OptionsName;
			delta: number;
			max?: number;
			min?: number;
			ensure?: boolean;
		},
	],
	{
		applied: boolean;
	}
> = async (context, data) => {
	const Options = new OptionsRepository(context.db);

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
	if (updatedRows === 0 && data.ensure === true) {
		//* no update can also mean the limit stopped it, so an existing value is never reset
		const ensureRes = await Options.ensureIntValue({ name: data.name });
		if (ensureRes.error) return ensureRes;

		const retryRes = await Options.adjustInt({
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
		if (retryRes.error) return retryRes;

		const retryUpdatedRows = Number(retryRes.data.count);
		return {
			error: undefined,
			data: {
				applied: retryUpdatedRows > 0,
			},
		};
	}

	if (updatedRows === 0) {
		if (data.max === undefined || data.delta <= 0) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.options.not.found.message"),
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
