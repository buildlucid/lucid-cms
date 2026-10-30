/**
 * Permission keys, for use with `usePermissions` and the `permission` props.
 */
export const Permissions = {
	UsersRead: "users:read",
	UsersCreate: "users:create",
	UsersUpdate: "users:update",
	UsersDelete: "users:delete",
	RolesRead: "roles:read",
	RolesCreate: "roles:create",
	RolesUpdate: "roles:update",
	RolesDelete: "roles:delete",
	MediaRead: "media:read",
	MediaCreate: "media:create",
	MediaUpdate: "media:update",
	MediaDelete: "media:delete",
	MediaReadAll: "media:read-all",
	EmailRead: "email:read",
	EmailSend: "email:send",
	EmailDelete: "email:delete",
	JobsRead: "jobs:read",
	JobsRun: "jobs:run",
	JobsUpdate: "jobs:update",
	RequestsRead: "requests:read",
	AiImageGenerate: "ai:image-generate",
	AiAudioGenerate: "ai:audio-generate",
	AiAltGenerate: "ai:alt-generate",
	AiRoutinesManageAll: "ai:routines-manage-all",
	AiMemoriesManage: "ai:memories-manage",
	IntegrationsRead: "integrations:read",
	IntegrationsCreate: "integrations:create",
	IntegrationsUpdate: "integrations:update",
	IntegrationsDelete: "integrations:delete",
	IntegrationsRegenerate: "integrations:regenerate",
	SettingsRead: "settings:read",
	SettingsUpdate: "settings:update",
	ConnectionUpdate: "connection:update",
	CacheClear: "cache:clear",
} as const;

export type CorePermission = (typeof Permissions)[keyof typeof Permissions];
export type DocumentPermissionAction =
	| "read"
	| "create"
	| "create-request"
	| "update"
	| "delete"
	| "delete-request"
	| "unpublish-request"
	| "restore"
	| "publish"
	| "review";
export type DocumentPermission<
	TAction extends DocumentPermissionAction = DocumentPermissionAction,
> = `documents:${string}:${TAction}`;

/** Builds a collection permission key, eg. `documents:pages:read`, as core's `getCollectionPermission` does. */
export const getCollectionPermission = <
	TAction extends DocumentPermissionAction,
>(
	collectionKey: string,
	action: TAction,
): DocumentPermission<TAction> => `documents:${collectionKey}:${action}`;
export type AgentPermission =
	`agents:${string}:${"chat" | "manage-own-routines" | "manage-code-routines"}`;

export type Permission = CorePermission | DocumentPermission | AgentPermission;
