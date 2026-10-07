import z from "zod";

export type MediaStorageOptionName = "media_storage_used";
export type InstanceIdOptionName = "instance_id";

export const mediaStorageOptionNameSchema = z.literal("media_storage_used");
export const instanceIdOptionNameSchema = z.literal("instance_id");

export const optionsNameSchema = z.union([
	mediaStorageOptionNameSchema,
	instanceIdOptionNameSchema,
]);

export type OptionsName = z.infer<typeof optionsNameSchema>;
