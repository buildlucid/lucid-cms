import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const updateSingle: ServiceFn<
	[
		{
			id: number;
			name?: string;
			description?: string;
			enabled?: boolean;
		},
	],
	undefined
> = async (context, data) => {
	const ClientIntegrationsRepo = Repository.get(
		"client-integrations",
		context.db,
		context.config.db,
	);

	const checkExists = await ClientIntegrationsRepo.selectSingle({
		select: ["id"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
	});
	if (checkExists === undefined) {
		return {
			error: {
				type: "basic",
				message: T("client_integration_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const updateRes = await ClientIntegrationsRepo.updateSingle({
		data: {
			name: data.name,
			description: data.description,
			enabled: data.enabled,
			updatedAt: new Date().toISOString(),
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
	});

	if (updateRes === undefined) {
		return {
			error: {
				type: "basic",
				status: 500,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateSingle;
