import constants from "../../../../../constants/constants.js";
import type { ServiceContext } from "../../../../../types.js";
import { translateServer } from "../../../../i18n/index.js";
import logger from "../../../../logger/index.js";
import { UsersRepository } from "../../../../repositories/index.js";
import type { FieldRelationValidationInput } from "../../types.js";
import type { UserValidationData } from "./types.js";

/**
 * Validate user input data
 */
const validateUserInputData = async (
	context: ServiceContext,
	input: FieldRelationValidationInput,
): Promise<UserValidationData[]> => {
	const userIds = input.default ?? [];
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
			message: translateServer("core.users.validation.fetch.failed"),
		});
		return [];
	}
};

export default validateUserInputData;
