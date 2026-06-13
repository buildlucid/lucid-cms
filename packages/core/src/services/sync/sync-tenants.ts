import constants from "../../constants/constants.js";
import formatter from "../../libs/formatters/index.js";
import logger from "../../libs/logger/index.js";
import { TenantsRepository } from "../../libs/repositories/index.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";

/**
 * Syncs the tenants in the database with the tenants in the config. Handles creating, soft-deleting, and restoring.
 */
const syncTenants: ServiceFn<[], undefined> = async (
	context: ServiceContext,
) => {
	const Tenants = new TenantsRepository(context.db.client, context.config.db);
	const tenantKeys = context.config.tenants.map((tenant) => tenant.key);

	const tenantsRes = await Tenants.selectMultiple({
		select: ["key", "is_deleted"],
		validation: {
			enabled: true,
		},
	});
	if (tenantsRes.error) return tenantsRes;

	const tenantKeysFromDB = tenantsRes.data.map((tenant) => tenant.key);

	// Get tenant keys that are in the config but not in the database
	const missingTenants = tenantKeys.filter(
		(tenant) => !tenantKeysFromDB.includes(tenant),
	);
	if (missingTenants.length > 0) {
		logger.debug({
			message: `Syncing new tenants to the DB: ${missingTenants.join(", ")}`,
			scope: constants.logScopes.sync,
		});
	}

	// Get tenant keys that are in the database but not in the config
	const tenantsToDelete = tenantsRes.data.filter(
		(tenant) =>
			!tenantKeys.includes(tenant.key) &&
			formatter.formatBoolean(tenant.is_deleted) === false,
	);
	const tenantsToDeleteKeys = tenantsToDelete.map((tenant) => tenant.key);
	if (tenantsToDeleteKeys.length > 0) {
		logger.debug({
			message: `Marking the following tenants as deleted: ${tenantsToDeleteKeys.join(", ")}`,
			scope: constants.logScopes.sync,
		});
	}

	// Get tenants that are in the database as is_deleted but in the config
	const unDeletedTenants = tenantsRes.data.filter(
		(tenant) =>
			formatter.formatBoolean(tenant.is_deleted) &&
			tenantKeys.includes(tenant.key),
	);
	const unDeletedTenantKeys = unDeletedTenants.map((tenant) => tenant.key);
	if (unDeletedTenantKeys.length > 0) {
		logger.debug({
			message: `Restoring previously deleted tenants: ${unDeletedTenantKeys.join(", ")}`,
			scope: constants.logScopes.sync,
		});
	}

	const [createRes, deleteRes, restoreRes] = await Promise.all([
		missingTenants.length > 0 &&
			Tenants.createMultiple({
				data: missingTenants.map((tenant) => ({
					key: tenant,
				})),
			}),
		tenantsToDeleteKeys.length > 0 &&
			Tenants.updateSingle({
				data: {
					is_deleted: true,
					is_deleted_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
				where: [
					{
						key: "key",
						operator: "in",
						value: tenantsToDeleteKeys,
					},
				],
				returning: ["key"],
				validation: {
					enabled: true,
				},
			}),
		unDeletedTenantKeys.length > 0 &&
			Tenants.updateSingle({
				data: {
					is_deleted: false,
					is_deleted_at: null,
					updated_at: new Date().toISOString(),
				},
				where: [
					{
						key: "key",
						operator: "in",
						value: unDeletedTenantKeys,
					},
				],
				returning: ["key"],
				validation: {
					enabled: true,
				},
			}),
	]);
	if (typeof createRes !== "boolean" && createRes.error) return createRes;
	if (typeof deleteRes !== "boolean" && deleteRes.error) return deleteRes;
	if (typeof restoreRes !== "boolean" && restoreRes.error) return restoreRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default syncTenants;
