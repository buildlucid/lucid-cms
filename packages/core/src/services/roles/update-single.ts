import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { isCorePermission } from "../../libs/permission/registry.js";
import {
	RolePermissionsRepository,
	RolesRepository,
	RoleTranslationsRepository,
} from "../../libs/repositories/index.js";
import { getTenantConfig } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { invalidateAuthCache } from "../auth/helpers/auth-cache.js";
import { roleServices } from "../index.js";
import checkRoleAccess from "./checks/check-role-access.js";
import {
	getTranslationValue,
	prepareRoleTranslations,
	type RoleTranslationInput,
} from "./helpers/role-translations.js";

const updateSingle: ServiceFn<
	[
		{
			id: number;
			name?: RoleTranslationInput;
			description?: RoleTranslationInput;
			permissions?: string[];
			tenantKey?: string | null;
			authSuperAdmin: boolean;
		},
	],
	undefined
> = async (context, data) => {
	const Roles = new RolesRepository(context.db.client, context.config.db);
	const RoleTranslations = new RoleTranslationsRepository(
		context.db.client,
		context.config.db,
	);
	const defaultRoleLocale = context.config.i18n.defaultLocale;
	const roleLocaleCodes = new Set(
		context.config.i18n.locales.map((locale) => locale.code),
	);

	const defaultName = getTranslationValue(data.name, defaultRoleLocale);
	const defaultDescription = getTranslationValue(
		data.description,
		defaultRoleLocale,
	);

	const [roleRes, validatePermsRes] = await Promise.all([
		checkRoleAccess(context, {
			id: data.id,
		}),
		data.permissions !== undefined
			? roleServices.validatePermissions(context, {
					permissions: data.permissions,
				})
			: undefined,
	]);
	if (roleRes.error) return roleRes;
	if (validatePermsRes?.error) return validatePermsRes;

	if (formatter.formatBoolean(roleRes.data.locked)) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.permissions.denied"),
				status: 403,
			},
			data: undefined,
		};
	}

	const tenantKey =
		data.tenantKey === undefined ? roleRes.data.tenant_key : data.tenantKey;

	/**
	 * Explicit tenant assignment can move a role across tenant boundaries, so it is super-admin only.
	 */
	if (data.tenantKey !== undefined && !data.authSuperAdmin) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.permissions.denied"),
				status: 403,
			},
			data: undefined,
		};
	}

	if (
		context.request.tenantKey != null &&
		roleRes.data.tenant_key !== null &&
		roleRes.data.tenant_key !== context.request.tenantKey &&
		!data.authSuperAdmin
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.permissions.denied"),
				status: 403,
			},
			data: undefined,
		};
	}

	if (data.name !== undefined && (!defaultName || defaultName.length < 2)) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.errors.validation.message"),
				status: 400,
				errors: {
					name: {
						code: "invalid",
						message: copy("server:core.fields.validation.required"),
					},
				},
			},
			data: undefined,
		};
	}

	if (
		tenantKey !== null &&
		getTenantConfig(context.config, tenantKey) === undefined
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.tenants.unknown", {
					data: { key: tenantKey },
				}),
				status: 400,
			},
			data: undefined,
		};
	}

	const checkNameIsUniqueRes =
		defaultName != null
			? await Roles.selectRoleIdByTranslationName({
					name: defaultName,
					localeCode: defaultRoleLocale,
					tenantKey,
					excludeRoleId: data.id,
				})
			: undefined;
	if (checkNameIsUniqueRes?.error) return checkNameIsUniqueRes;

	if (defaultName != null && checkNameIsUniqueRes?.data !== undefined) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.validation.unique.message"),
				status: 400,
				errors: {
					name: {
						code: "invalid",
						message: copy("server:core.validation.unique.message"),
					},
				},
			},
			data: undefined,
		};
	}
	const updateData: {
		updated_at: string;
		tenant_key?: string | null;
	} = {
		updated_at: new Date().toISOString(),
	};
	if (data.tenantKey !== undefined) {
		updateData.tenant_key = data.tenantKey;
	}
	const updateRoleRes = await Roles.updateSingle({
		data: updateData,
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
	if (updateRoleRes.error) return updateRoleRes;

	await invalidateAuthCache(context);

	if (data.name !== undefined || data.description !== undefined) {
		const existingNameTranslations: RoleTranslationInput =
			roleRes.data.translations
				?.filter(
					(translation) =>
						translation.locale_code !== null &&
						roleLocaleCodes.has(translation.locale_code),
				)
				.map((translation) => ({
					localeCode: translation.locale_code,
					value: translation.name,
				})) ?? [];
		const existingDescriptionTranslations: RoleTranslationInput =
			roleRes.data.translations
				?.filter(
					(translation) =>
						translation.locale_code !== null &&
						roleLocaleCodes.has(translation.locale_code),
				)
				.map((translation) => ({
					localeCode: translation.locale_code,
					value: translation.description,
				})) ?? [];
		const existingDefaultName = getTranslationValue(
			existingNameTranslations,
			defaultRoleLocale,
		);
		const existingDefaultDescription = getTranslationValue(
			existingDescriptionTranslations,
			defaultRoleLocale,
		);
		const translations = prepareRoleTranslations({
			name: data.name ?? existingNameTranslations,
			description: data.description ?? existingDescriptionTranslations,
			roleId: data.id,
		});
		if (
			translations.every(
				(translation) => translation.locale_code !== defaultRoleLocale,
			)
		) {
			translations.push({
				role_id: data.id,
				locale_code: defaultRoleLocale,
				name:
					data.name !== undefined
						? (defaultName ?? null)
						: (existingDefaultName ?? null),
				description:
					data.description !== undefined
						? (defaultDescription ?? null)
						: (existingDefaultDescription ?? null),
			});
		}
		const deleteTranslationsRes = await RoleTranslations.deleteMultiple({
			where: [
				{
					key: "role_id",
					operator: "=",
					value: data.id,
				},
			],
			returning: ["id"],
		});
		if (deleteTranslationsRes.error) return deleteTranslationsRes;

		if (translations.length > 0) {
			const roleTranslationsRes = await RoleTranslations.upsertMultiple({
				data: translations,
				returning: ["id"],
				validation: {
					enabled: true,
				},
			});
			if (roleTranslationsRes.error) return roleTranslationsRes;
		}
	}

	if (validatePermsRes?.data !== undefined) {
		const RolePermissions = new RolePermissionsRepository(
			context.db.client,
			context.config.db,
		);

		const deletePermsRes = await RolePermissions.deleteMultiple({
			where: [
				{
					key: "role_id",
					operator: "=",
					value: data.id,
				},
			],
			returning: ["id"],
			validation: {
				enabled: true,
			},
		});
		if (deletePermsRes.error) return deletePermsRes;

		if (validatePermsRes.data.length > 0) {
			const rolePermsRes = await RolePermissions.createMultiple({
				data: validatePermsRes.data.map((p) => ({
					role_id: data.id,
					permission: p.permission,
					core: isCorePermission(p.permission),
				})),
			});
			if (rolePermsRes.error) return rolePermsRes;
		}
	}

	await invalidateAuthCache(context);

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateSingle;
