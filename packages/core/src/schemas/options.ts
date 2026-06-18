import z from "zod";

export type LicenseOptionName = z.infer<typeof licenseOptionNameSchema>;
export type TenantScopedLicenseOptionName = `${LicenseOptionName}:t:${string}`;
export type MediaStorageOptionName = "media_storage_used";
export type TenantScopedMediaStorageOptionName =
	`${MediaStorageOptionName}:t:${string}`;

export const licenseOptionNameSchema = z.union([
	z.literal("license_key"),
	z.literal("license_key_display"),
	z.literal("license_valid"),
	z.literal("license_last_checked"),
	z.literal("license_error_message"),
	z.literal("license_ai_enabled"),
]);

export const tenantScopedLicenseOptionNameSchema =
	z.custom<TenantScopedLicenseOptionName>((value) => {
		if (typeof value !== "string") return false;

		const [name, tenantKey] = value.split(":t:");
		if (name === undefined || tenantKey === undefined) return false;

		return (
			licenseOptionNameSchema.safeParse(name).success && tenantKey.length > 0
		);
	});

export const mediaStorageOptionNameSchema = z.literal("media_storage_used");

export const tenantScopedMediaStorageOptionNameSchema =
	z.custom<TenantScopedMediaStorageOptionName>((value) => {
		if (typeof value !== "string") return false;

		const [name, tenantKey] = value.split(":t:");
		if (name === undefined || tenantKey === undefined) return false;

		return (
			mediaStorageOptionNameSchema.safeParse(name).success &&
			tenantKey.length > 0
		);
	});

export const optionsNameSchema = z.union([
	mediaStorageOptionNameSchema,
	tenantScopedMediaStorageOptionNameSchema,
	z.literal("system_alert_email"),
	licenseOptionNameSchema,
	tenantScopedLicenseOptionNameSchema,
]);

export type OptionsName = z.infer<typeof optionsNameSchema>;
