import z from "zod";
import { isNotificationDefinition } from "../../notifications/registry.js";
import type { AnyNotificationDefinition } from "../../notifications/types.js";

const type = z.custom<AnyNotificationDefinition>(
	isNotificationDefinition,
	"Provide a notification type created with defineNotification.",
);

export const sendSchema = z.object({
	type,
	data: z.record(z.string(), z.unknown()),
	key: z.string().trim().min(1).optional(),
	fingerprint: z.string().trim().min(1).optional(),
	recipients: z.array(z.number().int().positive()).optional(),
	actorUserId: z.number().int().positive().nullable().optional(),
	actorRunId: z.uuid().nullable().optional(),
});

export const upsertSchema = sendSchema.extend({
	key: z.string().trim().min(1),
});

export const resolveSchema = z.object({
	type,
	key: z.string().trim().min(1),
});
