import {
	OAuthAuthorizationRequestsRepository,
	OAuthClientsRepository,
	OAuthGrantsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import deleteMediaPermanently from "../media/delete-single-permanently.js";

const deleteSingle: ServiceFn<
	[{ id: number; userId: number }],
	undefined
> = async (context, data) => {
	const OAuthClients = new OAuthClientsRepository(context.db);
	const AuthorizationRequests = new OAuthAuthorizationRequestsRepository(
		context.db,
	);
	const Grants = new OAuthGrantsRepository(context.db);

	const existingRes = await OAuthClients.selectSingle({
		select: ["client_id", "logo_media_id"],
		where: [{ key: "id", operator: "=", value: data.id }],
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
			},
		},
	});
	if (existingRes.error) return existingRes;

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

	const deleteRes = await OAuthClients.deleteSingle({
		where: [{ key: "id", operator: "=", value: data.id }],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (deleteRes.error) return deleteRes;

	if (existingRes.data.logo_media_id !== null) {
		const deleteLogoRes = await deleteMediaPermanently(context, {
			id: existingRes.data.logo_media_id,
			userId: data.userId,
		});
		if (deleteLogoRes.error) return deleteLogoRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
