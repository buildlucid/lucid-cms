import type { ConnectionStatus } from "@lucidcms/types";
import z from "zod";

export const connectionPendingSchema = z
	.object({
		codeVerifier: z.string().min(43).max(128),
		browserBindingHash: z.string().length(64),
		expiresAt: z.number().int().positive(),
		redirectUri: z.url(),
		issuer: z.url(),
		resource: z.url(),
	})
	.strict();

export type ConnectionPending = z.infer<typeof connectionPendingSchema>;

export type StoredConnectionDisplay = Pick<
	ConnectionStatus,
	"connection" | "organisation" | "scope" | "resource"
>;
