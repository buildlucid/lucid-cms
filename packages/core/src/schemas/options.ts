import z from "zod";

export const optionsNameSchema = z.union([
	z.literal("media_storage_used"),
	z.literal("system_alert_email"),
	z.literal("license_key"),
	z.literal("license_key_display"),
	z.literal("license_valid"),
	z.literal("license_last_checked"),
	z.literal("license_error_message"),
	z.literal("license_ai_enabled"),
]);

export type OptionsName = z.infer<typeof optionsNameSchema>;
