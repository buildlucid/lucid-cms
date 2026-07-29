import formatter from "../../libs/formatters/index.js";
import {
	OAuthAuthorizationRequestsRepository,
	OAuthClientRedirectUrisRepository,
	OAuthClientsRepository,
	OAuthGrantsRepository,
} from "../../libs/repositories/index.js";
import type { OAuthClientLogoInput } from "../../schemas/oauth-clients.js";
import type { OAuthClient } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";
import { isSafeRedirectUri } from "../oauth/helpers/client-metadata.js";
import getSingle from "./get-single.js";
import {
	createOAuthClientLogo,
	updateOAuthClientLogo,
} from "./helpers/logo.js";

const updateSingle: ServiceFn<
	[
		{
			id: number;
			name?: string;
			clientUri?: string | null;
			redirectUris?: string[];
			enabled?: boolean;
			logo?: OAuthClientLogoInput;
			removeLogo?: boolean;
			userId: number;
		},
	],
	OAuthClient
> = async (context, data) => {
	const redirectUris = data.redirectUris
		? [...new Set(data.redirectUris)]
		: undefined;
	if (redirectUris && !redirectUris.every(isSafeRedirectUri)) {
		return {
			error: {
				type: "validation",
				status: 400,
				errors: {
					redirectUris: {
						code: "invalid_request",
					},
				},
			},
			data: undefined,
		};
	}

	const OAuthClients = new OAuthClientsRepository(
		context.db.client,
		context.config.db,
	);
	const RedirectUris = new OAuthClientRedirectUrisRepository(
		context.db.client,
		context.config.db,
	);
	const AuthorizationRequests = new OAuthAuthorizationRequestsRepository(
		context.db.client,
		context.config.db,
	);
	const Grants = new OAuthGrantsRepository(
		context.db.client,
		context.config.db,
	);

	const existingRes = await OAuthClients.selectSingle({
		select: ["client_id", "logo_media_id", "enabled"],
		where: [{ key: "id", operator: "=", value: data.id }],
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
			},
		},
	});
	if (existingRes.error) return existingRes;

	let logoMediaId = existingRes.data.logo_media_id;
	if (data.logo && logoMediaId !== null) {
		const logoRes = await updateOAuthClientLogo(
			context,
			logoMediaId,
			data.logo,
			data.userId,
		);
		if (logoRes.error) return logoRes;
	} else if (data.logo) {
		const logoRes = await createOAuthClientLogo(
			context,
			data.logo,
			data.userId,
		);
		if (logoRes.error) return logoRes;
		logoMediaId = logoRes.data;
	} else if (data.removeLogo === true) {
		logoMediaId = null;
	}

	const updateRes = await OAuthClients.updateSingle({
		data: {
			name: data.name,
			client_uri: data.clientUri,
			enabled: data.enabled,
			logo_media_id:
				data.logo !== undefined || data.removeLogo === true
					? logoMediaId
					: undefined,
			updated_at: new Date().toISOString(),
		},
		where: [{ key: "id", operator: "=", value: data.id }],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (updateRes.error) return updateRes;

	const invalidateRequestsRes = await AuthorizationRequests.updateMultiple({
		data: {
			consumed_at: new Date().toISOString(),
		},
		where: [
			{ key: "client_id", operator: "=", value: existingRes.data.client_id },
			{ key: "consumed_at", operator: "is", value: null },
		],
	});
	if (invalidateRequestsRes.error) return invalidateRequestsRes;

	if (redirectUris) {
		const deleteRedirectsRes = await RedirectUris.deleteMultiple({
			where: [{ key: "oauth_client_id", operator: "=", value: data.id }],
		});
		if (deleteRedirectsRes.error) return deleteRedirectsRes;

		const createRedirectsRes = await RedirectUris.createMultiple({
			data: redirectUris.map((redirectUri) => ({
				oauth_client_id: data.id,
				redirect_uri: redirectUri,
				created_at: new Date().toISOString(),
			})),
		});
		if (createRedirectsRes.error) return createRedirectsRes;
	}

	if (data.name !== undefined || data.clientUri !== undefined) {
		const updateGrantsRes = await Grants.updateMultiple({
			data: {
				client_name: data.name,
				client_uri: data.clientUri,
				updated_at: new Date().toISOString(),
			},
			where: [
				{ key: "client_id", operator: "=", value: existingRes.data.client_id },
			],
		});
		if (updateGrantsRes.error) return updateGrantsRes;
	}

	const wasEnabled = formatter.formatBoolean(existingRes.data.enabled);
	if (wasEnabled && data.enabled === false) {
		const revokeRes = await Grants.updateMultiple({
			data: {
				revoked_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			where: [
				{ key: "client_id", operator: "=", value: existingRes.data.client_id },
				{ key: "revoked_at", operator: "is", value: null },
			],
		});
		if (revokeRes.error) return revokeRes;
	}

	if (data.removeLogo === true && existingRes.data.logo_media_id !== null) {
		const deleteLogoRes = await mediaServices.deleteSinglePermanently(context, {
			id: existingRes.data.logo_media_id,
			userId: data.userId,
		});
		if (deleteLogoRes.error) return deleteLogoRes;
	}

	return getSingle(context, { id: data.id });
};

export default updateSingle;
