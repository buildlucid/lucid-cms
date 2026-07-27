import z from "zod";

export type MediaStorageOptionName = "media_storage_used";
export type TenantScopedMediaStorageOptionName =
	`${MediaStorageOptionName}:t:${string}`;
export type InstanceIdOptionName = "instance_id";
export type TenantScopedInstanceIdOptionName =
	`${InstanceIdOptionName}:t:${string}`;

export const mediaStorageOptionNameSchema = z.literal("media_storage_used");
export const instanceIdOptionNameSchema = z.literal("instance_id");

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

export const tenantScopedInstanceIdOptionNameSchema =
	z.custom<TenantScopedInstanceIdOptionName>((value) => {
		if (typeof value !== "string") return false;

		const [name, tenantKey] = value.split(":t:");
		if (name === undefined || tenantKey === undefined) return false;

		return (
			instanceIdOptionNameSchema.safeParse(name).success && tenantKey.length > 0
		);
	});

export const optionsNameSchema = z.union([
	mediaStorageOptionNameSchema,
	tenantScopedMediaStorageOptionNameSchema,
	instanceIdOptionNameSchema,
	tenantScopedInstanceIdOptionNameSchema,
	z.literal("system_alert_email"),
]);

export type OptionsName = z.infer<typeof optionsNameSchema>;
