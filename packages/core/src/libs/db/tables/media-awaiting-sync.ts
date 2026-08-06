import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const mediaAwaitingSyncTable = defineTable(
	"lucid_media_awaiting_sync",
	() => ({
		columns: {
			key: {
				schema: z.string(),
				type: "text",
			},
			timestamp: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidMediaAwaitingSync {
	key: string;
	timestamp: TimestampImmutable;
}
