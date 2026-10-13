import z from "zod";
import type { UserDisplay } from "../../types/response.js";
import { mediaImagePreviewResponseSchema } from "../media.js";

/** User display details for attribution and permissions, excluding contact information. */
export const userDisplaySchema = z.object({
	id: z.number(),
	username: z.string(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	profilePicture: mediaImagePreviewResponseSchema.nullable(),
}) satisfies z.ZodType<UserDisplay>;
