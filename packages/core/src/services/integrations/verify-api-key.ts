import { timingSafeEqual } from "node:crypto";
import { scrypt } from "@noble/hashes/scrypt.js";
import constants from "../../constants/constants.js";
import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import type { ExternalScope } from "../../libs/permission/external-scopes.js";
import { IntegrationsRepository } from "../../libs/repositories/index.js";
import type { LucidApiKeyExternalAuth } from "../../types/hono.js";
import { decrypt } from "../../utils/helpers/encrypt-decrypt.js";
import { decodeApiKey } from "../../utils/integrations/encode-api-key.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveUserAuthority from "./resolve-user-authority.js";

/** Verifies an API key and resolves its external request authority. */
const verifyApiKey: ServiceFn<
	[
		{
			apiKey: string;
		},
	],
	LucidApiKeyExternalAuth
> = async (context, data) => {
	const Integrations = new IntegrationsRepository(
		context.db.client,
		context.config.db,
	);

	const { key: decodedKey, apiKey: decodedApiKey } = decodeApiKey(data.apiKey);
	if (!decodedApiKey) {
		return {
			error: {
				message: copy("server:core.integrations.api.key.missing"),
			},
			data: undefined,
		};
	}
	if (!decodedKey) {
		return {
			error: {
				message: copy("server:core.integrations.key.missing"),
			},
			data: undefined,
		};
	}

	const integrationRes = await Integrations.selectSingleByKeyWithScopes({
		key: decodedKey,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.integrations.not.found"),
			},
		},
	});
	if (integrationRes.error) return integrationRes;

	if (!formatter.formatBoolean(integrationRes.data.enabled)) {
		return {
			error: {
				message: copy("server:core.integrations.disabled"),
			},
			data: undefined,
		};
	}

	if (
		integrationRes.data.expires_at !== null &&
		new Date(integrationRes.data.expires_at).getTime() <= Date.now()
	) {
		return {
			error: {
				message: copy("server:core.integrations.expired"),
			},
			data: undefined,
		};
	}

	const secret = decrypt(
		integrationRes.data.secret,
		context.config.secrets.encryption,
	);

	const inputApiKeyHash = Buffer.from(
		scrypt(decodedApiKey, secret, constants.scrypt),
	).toString("base64");

	const inputHashBuffer = Buffer.from(inputApiKeyHash, "utf8");
	const storedHashBuffer = Buffer.from(integrationRes.data.api_key, "utf8");
	const verifyApiKey =
		inputHashBuffer.length === storedHashBuffer.length &&
		timingSafeEqual(inputHashBuffer, storedHashBuffer);

	if (verifyApiKey === false) {
		return {
			error: {
				message: copy("server:core.integrations.api.key.invalid"),
			},
			data: undefined,
		};
	}

	const scopes = (integrationRes.data.scopes || []).map(
		(scope) => scope.scope as ExternalScope,
	);
	if (integrationRes.data.user_id !== null) {
		const authority = await resolveUserAuthority(context, {
			userId: integrationRes.data.user_id,
			tenantKey: integrationRes.data.tenant_key,
			scopes,
		});
		if (authority.error) return authority;

		return {
			error: undefined,
			data: {
				credential: {
					type: "api-key",
					integrationId: integrationRes.data.id,
				},
				principal: authority.data.principal,
				scopes: authority.data.scopes,
				tenantKey: authority.data.tenantKey,
			},
		};
	}

	return {
		error: undefined,
		data: {
			credential: {
				type: "api-key",
				integrationId: integrationRes.data.id,
			},
			principal: {
				type: "system",
			},
			scopes,
			tenantKey: integrationRes.data.tenant_key,
		},
	};
};

export default verifyApiKey;
