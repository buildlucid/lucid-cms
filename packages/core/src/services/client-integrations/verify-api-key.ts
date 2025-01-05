import T from "../../translations/index.js";
import argon2 from "argon2";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import { decrypt } from "../../utils/helpers/encrypt-decrypt.js";
import type { ServiceFn } from "../../utils/services/types.js";

const verifyApiKey: ServiceFn<
	[
		{
			key: string;
			apiKey: string;
		},
	],
	{
		id: number;
		key: string;
	}
> = async (context, data) => {
	const ClientIntegrations = Repository.get(
		"client-integrations",
		context.db,
		context.config.db,
	);

	const clientIntegrationRes = await ClientIntegrations.selectSingle({
		where: [
			{
				key: "key",
				operator: "=",
				value: data.key,
			},
		],
		select: ["id", "api_key", "secret", "enabled", "key"],
		validation: {
			enabled: true,
			defaultError: {
				message: T("cannot_find_client_integration"),
			},
		},
	});
	if (clientIntegrationRes.error) return clientIntegrationRes;

	if (!Formatter.formatBoolean(clientIntegrationRes.data.enabled)) {
		return {
			error: {
				message: T("client_integration_is_disabled"),
			},
			data: undefined,
		};
	}

	const secret = decrypt(
		clientIntegrationRes.data.secret,
		context.config.keys.encryptionKey,
	);

	const verifyApiKey = await argon2.verify(
		clientIntegrationRes.data.api_key,
		data.apiKey,
		{
			secret: Buffer.from(secret),
		},
	);
	if (verifyApiKey === false) {
		return {
			error: {
				message: T("invalid_client_integration_api_key"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			id: clientIntegrationRes.data.id,
			key: clientIntegrationRes.data.key,
		},
	};
};

export default verifyApiKey;
