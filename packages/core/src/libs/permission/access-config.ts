import z from "zod";
import {
	adminCopyInputSchema,
	resolvedAdminCopySchema,
} from "../i18n/index.js";
import type { AdminCopyInput } from "../i18n/types.js";
import type { ExternalPrincipalType } from "./external-scopes.js";
import type { Permission } from "./types.js";

export type AccessPermission = {
	/** Label shown when assigning permissions. */
	name: AdminCopyInput;
	/** Explains what this permission allows. */
	description?: AdminCopyInput;
};

export type AccessScope = {
	/** For user credentials, the permission their owner must hold. Use null when no role permission is required. */
	userPermission: Permission | (string & {}) | null;
	/** Label shown when granting access. Defaults to the linked permission's name. Required when userPermission is null. */
	name?: AdminCopyInput;
	/** Explains what this scope allows. Defaults to the linked permission's description. */
	description?: AdminCopyInput;
	/** Allowed credential owners. Defaults to both user and system credentials. */
	principalTypes?: ExternalPrincipalType[];
};

export type AccessGroup = {
	/** Stable group key. Changing it does not change permission or scope keys. */
	key: string;
	/** Group label shown in permission and scope selectors. */
	name: AdminCopyInput;
	/** Explains what this group is for. */
	description?: AdminCopyInput;
	/** Permissions that can be assigned to roles, keyed by names such as "reports:read". */
	permissions?: Record<string, AccessPermission>;
	/** Scopes that can be granted to integrations. Declaring a scope does not grant it. */
	scopes?: Record<string, AccessScope>;
};

const adminCopy = adminCopyInputSchema.pipe(resolvedAdminCopySchema);

const accessKey = z
	.string()
	.regex(
		/^[a-z][a-z0-9_-]*(?::[a-z][a-z0-9_-]*)+$/,
		'Use a namespaced key such as "reports:read".',
	);

export const accessGroupSchema = z.strictObject({
	key: z.string().regex(/^[a-z][a-z0-9:_-]*$/),
	name: adminCopy,
	description: adminCopy.optional(),
	permissions: z
		.record(
			accessKey,
			z.strictObject({
				name: adminCopy,
				description: adminCopy.optional(),
			}),
		)
		.optional(),
	scopes: z
		.record(
			accessKey,
			z.strictObject({
				userPermission: z.string().min(1).nullable(),
				name: adminCopy.optional(),
				description: adminCopy.optional(),
				principalTypes: z
					.array(z.enum(["system", "user"]))
					.min(1)
					.refine(
						(values) => new Set(values).size === values.length,
						"Choose each principal type once.",
					)
					.optional(),
			}),
		)
		.optional(),
});
