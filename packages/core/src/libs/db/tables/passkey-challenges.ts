import type { Generated } from "kysely";
import z from "zod";
import constants from "../../../constants/constants.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

/** Challenges handed to the browser for a passkey sign-in or setup. Each one works once. */
export const passkeyChallengesTable = defineTable(
	"lucid_passkey_challenges",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			challenge: {
				schema: z.string(),
				type: "text",
			},
			purpose: {
				schema: z.union([
					z.literal(constants.passkeys.purposes.login),
					z.literal(constants.passkeys.purposes.registration),
					z.literal(constants.passkeys.purposes.twoFactor),
				]),
				type: "varchar",
				args: [255],
			},
			user_id: {
				schema: z.number().nullable(),
				type: "integer",
			},
			consumed_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			expiry_date: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

export type PasskeyChallengePurpose =
	(typeof constants.passkeys.purposes)[keyof typeof constants.passkeys.purposes];

export interface LucidPasskeyChallenges {
	id: Generated<number>;
	/** The base64url challenge the browser signs. */
	challenge: string;
	purpose: PasskeyChallengePurpose;
	/** The user adding a passkey or finishing a two-factor step. Empty for sign-ins, where the passkey says who it is. */
	user_id: number | null;
	consumed_at: TimestampMutable;
	created_at: TimestampImmutable;
	expiry_date: TimestampMutable;
}
