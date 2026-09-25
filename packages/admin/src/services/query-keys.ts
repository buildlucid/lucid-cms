import type { QueryBuilderProps } from "@/utils/query-builder";

/**
 * Query keys for Lucid data, for invalidating and updating cached queries.
 *
 * @example
 * ```ts
 * import { useQueryClient } from "@tanstack/solid-query";
 * import { queryKeys } from "@lucidcms/admin/services";
 *
 * const client = useQueryClient();
 *
 * await client.invalidateQueries({ queryKey: queryKeys.media.all() });
 * ```
 */
export const queryKeys = {
	agent: {
		all: () => ["lucid", "agent"] as const,
		conversations: () => ["lucid", "agent", "conversations"] as const,
		conversation: (id: string | undefined) =>
			["lucid", "agent", "conversations", id] as const,
		messages: (id: string | undefined) =>
			["lucid", "agent", "conversations", id, "messages"] as const,
		routines: () => ["lucid", "agent", "routines"] as const,
		routine: (id: string | undefined) =>
			["lucid", "agent", "routines", id] as const,
		routineRuns: (id: string | undefined) =>
			["lucid", "agent", "routines", id, "runs"] as const,
	},
	account: {
		verifyEmailChangeConfirm: () =>
			["lucid", "account", "verifyEmailChangeConfirm"] as const,
		verifyEmailChangeRevert: () =>
			["lucid", "account", "verifyEmailChangeRevert"] as const,
		verifyResetToken: () => ["lucid", "account", "verifyResetToken"] as const,
		all: () => ["lucid", "account"] as const,
		session: () => ["lucid", "account", "session"] as const,
	},
	collections: {
		all: () => ["lucid", "collections"] as const,
		list: (query: QueryBuilderProps, locale?: string) =>
			["lucid", "collections", "list", query, locale] as const,
		detail: (key: string | undefined, locale?: string) =>
			["lucid", "collections", "detail", key, locale] as const,
	},
	documents: {
		workflowAssignees: () =>
			["lucid", "documents", "workflowAssignees"] as const,
		all: () => ["lucid", "documents"] as const,
		collection: (key: string) =>
			["lucid", "documents", "collection", key] as const,
		list: (
			key: string | undefined,
			version: string,
			query: QueryBuilderProps,
			locale?: string,
		) =>
			[
				"lucid",
				"documents",
				"collection",
				key,
				"list",
				version,
				query,
				locale,
			] as const,
		detail: (
			key: string | undefined,
			id: number | undefined,
			version: string | number | undefined,
			query: QueryBuilderProps,
			locale?: string,
		) =>
			[
				"lucid",
				"documents",
				"collection",
				key,
				"detail",
				id,
				version,
				query,
				locale,
			] as const,
		revisions: (
			key: string | undefined,
			id: number | undefined,
			query: QueryBuilderProps,
			locale?: string,
		) =>
			[
				"lucid",
				"documents",
				"collection",
				key,
				"revisions",
				id,
				query,
				locale,
			] as const,
	},
	media: {
		all: () => ["lucid", "media"] as const,
		lists: () => ["lucid", "media", "list"] as const,
		list: (query: QueryBuilderProps, locale?: string) =>
			["lucid", "media", "list", query, locale] as const,
		detail: (id: number | undefined, locale?: string) =>
			["lucid", "media", "detail", id, locale] as const,
	},
	ai: {
		all: () => ["lucid", "ai"] as const,
		usage: () => ["lucid", "ai", "usage"] as const,
		usageChart: () => ["lucid", "ai", "usageChart"] as const,
	},
	auth: {
		all: () => ["lucid", "auth"] as const,
		providers: () => ["lucid", "auth", "providers"] as const,
		setupRequired: () => ["lucid", "auth", "setupRequired"] as const,
		validateInvitation: () => ["lucid", "auth", "validateInvitation"] as const,
	},
	connection: {
		all: () => ["lucid", "connection"] as const,
		status: () => ["lucid", "connection", "status"] as const,
	},
	email: {
		all: () => ["lucid", "email"] as const,
		list: () => ["lucid", "email", "list"] as const,
		detail: () => ["lucid", "email", "detail"] as const,
		transactions: () => ["lucid", "email", "transactions"] as const,
	},
	integrations: {
		all: () => ["lucid", "integrations"] as const,
		list: () => ["lucid", "integrations", "list"] as const,
		scopes: () => ["lucid", "integrations", "scopes"] as const,
		detail: () => ["lucid", "integrations", "detail"] as const,
	},
	jobs: {
		all: () => ["lucid", "jobs"] as const,
		list: () => ["lucid", "jobs", "list"] as const,
		schedules: () => ["lucid", "jobs", "schedules"] as const,
		detail: () => ["lucid", "jobs", "detail"] as const,
	},
	locales: {
		all: () => ["lucid", "locales"] as const,
		list: () => ["lucid", "locales", "list"] as const,
	},
	mediaFolders: {
		all: () => ["lucid", "mediaFolders"] as const,
		hierarchy: () => ["lucid", "mediaFolders", "hierarchy"] as const,
		list: () => ["lucid", "mediaFolders", "list"] as const,
	},
	mediaShareLinks: {
		all: () => ["lucid", "mediaShareLinks"] as const,
		list: () => ["lucid", "mediaShareLinks", "list"] as const,
		detail: () => ["lucid", "mediaShareLinks", "detail"] as const,
	},
	oauthAuthorization: {
		all: () => ["lucid", "oauthAuthorization"] as const,
		request: () => ["lucid", "oauthAuthorization", "request"] as const,
	},
	oauthClients: {
		all: () => ["lucid", "oauthClients"] as const,
		list: () => ["lucid", "oauthClients", "list"] as const,
		detail: () => ["lucid", "oauthClients", "detail"] as const,
	},
	oauthConnections: {
		all: () => ["lucid", "oauthConnections"] as const,
		list: () => ["lucid", "oauthConnections", "list"] as const,
	},
	permissions: {
		all: () => ["lucid", "permissions"] as const,
		list: () => ["lucid", "permissions", "list"] as const,
	},
	publishOperations: {
		all: () => ["lucid", "publishOperations"] as const,
		list: () => ["lucid", "publishOperations", "list"] as const,
		overview: () => ["lucid", "publishOperations", "overview"] as const,
		reviewers: () => ["lucid", "publishOperations", "reviewers"] as const,
		detail: () => ["lucid", "publishOperations", "detail"] as const,
	},
	publishing: {
		all: () => ["lucid", "publishing"] as const,
		overview: () => ["lucid", "publishing", "overview"] as const,
	},
	roles: {
		all: () => ["lucid", "roles"] as const,
		list: () => ["lucid", "roles", "list"] as const,
		detail: () => ["lucid", "roles", "detail"] as const,
	},
	settings: {
		all: () => ["lucid", "settings"] as const,
		detail: () => ["lucid", "settings", "detail"] as const,
	},
	share: {
		all: () => ["lucid", "share"] as const,
		access: () => ["lucid", "share", "access"] as const,
	},
	userLogins: {
		all: () => ["lucid", "userLogins"] as const,
		list: () => ["lucid", "userLogins", "list"] as const,
	},
	users: {
		all: () => ["lucid", "users"] as const,
		list: () => ["lucid", "users", "list"] as const,
		detail: () => ["lucid", "users", "detail"] as const,
	},
};
