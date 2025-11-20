import constants from "../../constants/constants.js";
import formatter from "../../libs/formatters/index.js";
import cacheKeys from "../../libs/kv-adapter/cache-keys.js";
import logger from "../../libs/logger/index.js";
import { LocalesRepository } from "../../libs/repositories/index.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";

/**
 * Syncs the locales in the database with the locales in the config. Handles, creating, soft-deleting, and restoring.
 */
const syncLocales: ServiceFn<[], undefined> = async (
	context: ServiceContext,
) => {
	const Locales = new LocalesRepository(context.db, context.config.db);
	const localeCodes = context.config.localization.locales.map(
		(locale) => locale.code,
	);

	const localesRes = await Locales.selectMultiple({
		select: ["code", "is_deleted"],
		validation: {
			enabled: true,
		},
	});
	if (localesRes.error) return localesRes;

	const localeCodesFromDB = localesRes.data.map((locale) => locale.code);

	// Get locale codes that are in the config but not in the database
	const missingLocales = localeCodes.filter(
		(locale) => !localeCodesFromDB.includes(locale),
	);
	if (missingLocales.length > 0) {
		logger.debug({
			message: `Syncing new locales to the DB: ${missingLocales.join(", ")}`,
			scope: constants.logScopes.sync,
		});
	}

	// Get locale codes that are in the database but not in the config
	const localesToDelete = localesRes.data.filter(
		(locale) =>
			!localeCodes.includes(locale.code) &&
			formatter.formatBoolean(locale.is_deleted) === false,
	);
	const localesToDeleteCodes = localesToDelete.map((locale) => locale.code);
	if (localesToDeleteCodes.length > 0) {
		logger.debug({
			message: `Marking the following locales as deleted: ${localesToDeleteCodes.join(", ")}`,
			scope: constants.logScopes.sync,
		});
	}

	// Get locals that are in the database as is_deleted but in the config
	const unDeletedLocales = localesRes.data.filter(
		(locale) =>
			formatter.formatBoolean(locale.is_deleted) &&
			localeCodes.includes(locale.code),
	);
	const unDeletedLocalesCodes = unDeletedLocales.map((locale) => locale.code);
	if (unDeletedLocalesCodes.length > 0) {
		logger.debug({
			message: `Restoring previously deleted locales: ${unDeletedLocalesCodes.join(", ")}`,
			scope: constants.logScopes.sync,
		});
	}

	const [createRes, deleteRes, restoreRes] = await Promise.all([
		missingLocales.length > 0 &&
			Locales.createMultiple({
				data: missingLocales.map((locale) => ({
					code: locale,
				})),
			}),
		localesToDeleteCodes.length > 0 &&
			Locales.updateSingle({
				data: {
					is_deleted: true,
					is_deleted_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
				where: [
					{
						key: "code",
						operator: "in",
						value: localesToDeleteCodes,
					},
				],
				returning: ["code"],
				validation: {
					enabled: true,
				},
			}),
		unDeletedLocalesCodes.length > 0 &&
			Locales.updateSingle({
				data: {
					is_deleted: false,
					is_deleted_at: null,
					updated_at: new Date().toISOString(),
				},
				where: [
					{
						key: "code",
						operator: "in",
						value: unDeletedLocales.map((locale) => locale.code),
					},
				],
				returning: ["code"],
				validation: {
					enabled: true,
				},
			}),
	]);
	if (typeof createRes !== "boolean" && createRes.error) return createRes;
	if (typeof deleteRes !== "boolean" && deleteRes.error) return deleteRes;
	if (typeof restoreRes !== "boolean" && restoreRes.error) return restoreRes;

	await context.kv.command.delete(cacheKeys.http.static.clientLocales);

	return {
		error: undefined,
		data: undefined,
	};
};

export default syncLocales;
