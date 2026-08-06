import { IntegrationsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkIntegrationAccess from "./checks/check-integration-access.js";

/** Deletes an integration. */
const deleteSingle: ServiceFn<
	[
		{
			id: number;
			userId: number | null;
		},
	],
	undefined
> = async (context, data) => {
	const Integrations = new IntegrationsRepository(context.db);

	const checkExistsRes = await checkIntegrationAccess(context, {
		id: data.id,
		userId: data.userId,
	});
	if (checkExistsRes.error) return checkExistsRes;

	const deleteRes = await Integrations.deleteSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
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

export default deleteSingle;
