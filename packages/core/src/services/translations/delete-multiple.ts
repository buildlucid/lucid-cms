import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteMultiple: ServiceFn<
	[
		{
			ids: Array<number | null>;
		},
	],
	undefined
> = async (context, data) => {
	const TranslationKeys = Repository.get(
		"translation-keys",
		context.db,
		context.config.db,
	);

	const deleteRes = await TranslationKeys.deleteMultiple({
		where: [
			{
				key: "id",
				operator: "in",
				value: data.ids.filter((id) => id !== null),
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (deleteRes.error) return deleteRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteMultiple;
