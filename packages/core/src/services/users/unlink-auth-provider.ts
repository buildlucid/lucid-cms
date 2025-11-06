import Formatter from "../../libs/formatters/index.js";
import Repository from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Unlinks an auth provider from the target user.
 *
 * If password auth is enabled, you may only unlink the last auth provider if you have a password set.
 * If password auth is disabled, you cannot unlink the last auth provider.
 */
const unlinkAuthProvider: ServiceFn<
	[
		{
			auth: LucidAuth;
			targetUserId: number;
			providerKey: string;
			compareTargetAndAuthIds: boolean;
		},
	],
	undefined
> = async (context, data) => {
	const Users = Repository.get("users", context.db, context.config.db);
	const UserAuthProviders = Repository.get(
		"user-auth-providers",
		context.db,
		context.config.db,
	);

	if (data.compareTargetAndAuthIds && data.auth.id === data.targetUserId) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("error_cant_unlink_yourself"),
			},
			data: undefined,
		};
	}

	const [userRes, providerRes, providersCountRes] = await Promise.all([
		Users.selectSingle({
			select: ["id", "password"],
			where: [
				{
					key: "id",
					operator: "=",
					value: data.targetUserId,
				},
			],
			validation: {
				enabled: true,
				defaultError: {
					status: 404,
					message: T("user_not_found_message"),
				},
			},
		}),
		UserAuthProviders.selectSingle({
			select: ["id"],
			where: [
				{
					key: "user_id",
					operator: "=",
					value: data.targetUserId,
				},
				{
					key: "provider_key",
					operator: "=",
					value: data.providerKey,
				},
			],
			validation: {
				enabled: true,
				defaultError: {
					status: 404,
					name: T("auth_provider_link_not_found_name"),
					message: T("auth_provider_link_not_found_message"),
				},
			},
		}),
		UserAuthProviders.count({
			where: [
				{
					key: "user_id",
					operator: "=",
					value: data.targetUserId,
				},
			],
		}),
	]);
	if (userRes.error) return userRes;
	if (providerRes.error) return providerRes;
	if (providersCountRes.error) return providersCountRes;

	const providersCount = Formatter.parseCount(providersCountRes.data?.count);
	const passwordEnabled = context.config.auth.password.enabled === true;
	const hasPassword = Boolean(userRes.data.password);
	const isLastProvider = providersCount <= 1;

	if (isLastProvider) {
		if (!passwordEnabled) {
			return {
				error: {
					type: "basic",
					status: 400,
					name: T("auth_provider_cannot_remove_last_link_name"),
					message: T(
						"auth_provider_cannot_remove_last_link_password_disabled_message",
					),
				},
				data: undefined,
			};
		}

		if (!hasPassword) {
			return {
				error: {
					type: "basic",
					status: 400,
					name: T("auth_provider_cannot_remove_last_link_name"),
					message: T(
						"auth_provider_cannot_remove_last_link_no_password_message",
					),
				},
				data: undefined,
			};
		}
	}

	const [deleteRes, updateRes] = await Promise.all([
		UserAuthProviders.deleteSingle({
			returning: ["id"],
			where: [
				{
					key: "user_id",
					operator: "=",
					value: data.targetUserId,
				},
				{
					key: "provider_key",
					operator: "=",
					value: data.providerKey,
				},
			],
			validation: {
				enabled: true,
				defaultError: {
					status: 404,
					name: T("auth_provider_link_not_found_name"),
					message: T("auth_provider_link_not_found_message"),
				},
			},
		}),
		Users.updateSingle({
			data: {
				updated_at: new Date().toISOString(),
			},
			where: [
				{
					key: "id",
					operator: "=",
					value: data.targetUserId,
				},
			],
			returning: ["id"],
			validation: {
				enabled: true,
				defaultError: {
					status: 500,
				},
			},
		}),
	]);
	if (deleteRes.error) return deleteRes;
	if (updateRes.error) return updateRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default unlinkAuthProvider;
