import type { JSONColumnType } from "kysely";
import z from "zod";
import { userPreferencesSchema } from "../../../schemas/users.js";
import type { UserPreferences } from "../../../types/response.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampDefaulted } from "../types.js";

export const userPreferencesTable = defineTable(
	"lucid_user_preferences",
	() => ({
		columns: {
			user_id: { schema: z.number(), type: "integer" },
			preferences: { schema: userPreferencesSchema, type: "json" },
			updated_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

/** Synced admin preferences, with absent rows using admin defaults. */
export interface LucidUserPreferences {
	user_id: number;
	preferences: JSONColumnType<
		UserPreferences,
		UserPreferences,
		UserPreferences
	>;
	updated_at: TimestampDefaulted;
}
