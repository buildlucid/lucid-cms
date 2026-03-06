import constants from "../../../../../constants/constants.js";
import type { FieldValidationInput } from "../../../../../services/documents-bricks/helpers/fetch-validation-data.js";
import T from "../../../../../translations/index.js";
import type { ServiceContext } from "../../../../../types.js";
import logger from "../../../../logger/index.js";
import { UsersRepository } from "../../../../repositories/index.js";
import type { UserValidationData } from "./types.js";

/**
 * Validate user input data
 */
const validateUserInputData = async (
	context: ServiceContext,
	input: FieldValidationInput,
): Promise<UserValidationData[]> => {
	const userIds = input.ids;
	if (userIds.length === 0) return [];

	try {
		const Users = new UsersRepository(context.db.client, context.config.db);

		const usersRes = await Users.selectMultiple({
			select: ["id"],
			where: [
				{
					key: "id",
					operator: "in",
					value: userIds,
				},
			],
			validation: {
				enabled: true,
			},
		});

		return usersRes.error ? [] : usersRes.data;
	} catch (_err) {
		logger.error({
			scope: constants.logScopes.validation,
			message: T("error_fetching_users_for_validation"),
		});
		return [];
	}
};

export default validateUserInputData;
