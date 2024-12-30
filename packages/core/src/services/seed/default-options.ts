import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";

const defaultOptions: ServiceFn<[], undefined> = async (
	context: ServiceContext,
) => {
	try {
		const OptionsRepo = Repository.get(
			"options",
			context.db,
			context.config.db,
		);

		const mediaStorageOption = await OptionsRepo.selectSingle({
			select: ["name"],
			where: [
				{
					key: "name",
					operator: "=",
					value: "media_storage_used",
				},
			],
		});

		if (mediaStorageOption === undefined) {
			await OptionsRepo.createSingle({
				name: "media_storage_used",
				valueInt: 0,
			});
		}

		return {
			error: undefined,
			data: undefined,
		};
	} catch (error) {
		return {
			error: {
				type: "basic",
				message: T("option_error_occured_saving_default"),
			},
			data: undefined,
		};
	}
};

export default defaultOptions;
