import {
	UsersRepository,
	UserTenantsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getRetentionDays from "./helpers/get-retention-days.js";
import groupQueuePayloadsByTenant from "./helpers/group-queue-payloads-by-tenant.js";

/**
 * Finds all soft-deleted users older than 30 days and queues them for permanent deletion
 */
const deleteExpiredDeletedUsers: ServiceFn<[], undefined> = async (context) => {
	const Users = new UsersRepository(context.db.client, context.config.db);
	const UserTenants = new UserTenantsRepository(
		context.db.client,
		context.config.db,
	);

	const compDate = getRetentionDays(context.config.softDelete, "users");

	const softDeletedUsersRes = await Users.selectMultiple({
		select: ["id"],
		where: [
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "true"),
			},
			{
				key: "is_deleted_at",
				operator: "<",
				value: compDate,
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (softDeletedUsersRes.error) return softDeletedUsersRes;

	if (softDeletedUsersRes.data.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const userIds = softDeletedUsersRes.data.map((user) => user.id);
	const userTenantsRes = await UserTenants.selectMultiple({
		select: ["user_id", "tenant_key"],
		where: [
			{
				key: "user_id",
				operator: "in",
				value: userIds,
			},
		],
	});
	if (userTenantsRes.error) return userTenantsRes;

	const tenantKeysByUserId = new Map<number, string[]>();
	for (const userTenant of userTenantsRes.data ?? []) {
		const tenantKeys = tenantKeysByUserId.get(userTenant.user_id) ?? [];
		tenantKeys.push(userTenant.tenant_key);
		tenantKeysByUserId.set(userTenant.user_id, tenantKeys);
	}

	const groups = groupQueuePayloadsByTenant(
		softDeletedUsersRes.data.map((user) => ({
			payload: {
				id: user.id,
			},
			tenantKeys: tenantKeysByUserId.get(user.id),
		})),
	);

	for (const group of groups) {
		const queueRes = await context.queue.addBatch(context, {
			event: "users:delete",
			payloads: group.payloads,
			options:
				group.tenantKeys.length > 0
					? { tenantKeys: group.tenantKeys }
					: undefined,
		});
		if (queueRes.error) return queueRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteExpiredDeletedUsers;
