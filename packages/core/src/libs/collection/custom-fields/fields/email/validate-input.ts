import constants from "../../../../../constants/constants.js";
import type { ServiceContext } from "../../../../../exports/types.js";
import logger from "../../../../logger/index.js";
import EmailsRepository from "../../../../repositories/emails.js";
import type { FieldRelationValidationInput } from "../../types.js";
import type { EmailValidationData } from "./types.js";

/** Loads referenced email types for each field's `allowInternal` check, treating system notification emails as missing so they never enter content. */
const validateEmailInputData = async (
	context: ServiceContext,
	input: FieldRelationValidationInput,
): Promise<EmailValidationData[]> => {
	const emailIds = input.default ?? [];
	if (emailIds.length === 0) return [];

	try {
		const Emails = new EmailsRepository(context.db);

		const emailsRes = await Emails.selectMultiple({
			select: ["id", "type"],
			where: [
				{
					key: "id",
					operator: "in",
					value: emailIds,
				},
				{
					key: "is_system",
					operator: "=",
					value: context.config.db.getDefault("boolean", "false"),
				},
			],
			validation: {
				enabled: true,
			},
		});

		return emailsRes.error ? [] : emailsRes.data;
	} catch (_err) {
		logger.error({
			scope: constants.logScopes.validation,
			message: "Failed to fetch emails for field validation",
		});
		return [];
	}
};

export default validateEmailInputData;
