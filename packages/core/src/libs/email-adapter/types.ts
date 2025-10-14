import type z from "zod/v4";
import type {
	emailDeliveryStatusSchema,
	emailTypeSchema,
} from "../../schemas/email.js";

export type RenderedTemplates = {
	[templateName: string]: {
		html: string;
		lastModified: string;
	};
};

export type EmailDeliveryStatus = z.infer<typeof emailDeliveryStatusSchema>;
export type EmailType = z.infer<typeof emailTypeSchema>;
