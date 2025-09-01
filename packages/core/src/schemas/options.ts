import z from "zod/v4";

export const optionsNameSchema = z.union([
	z.literal("media_storage_used"),
	z.literal("license_key"),
	z.literal("license_key_last4"),
	z.literal("license_valid"),
	z.literal("license_last_checked"),
	z.literal("license_error_message"),
]);

export type OptionsName = z.infer<typeof optionsNameSchema>;
