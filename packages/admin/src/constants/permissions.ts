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
	EmailRead: "email:read",
	EmailSend: "email:send",
	EmailDelete: "email:delete",
	JobsRead: "jobs:read",
	PublishOperationsRead: "publish-operations:read",
	AiCustomFieldValue: "ai:custom-field-value",
	AiImageGenerate: "ai:image-generate",
	AiAltGenerate: "ai:alt-generate",
	IntegrationsRead: "integrations:read",
	IntegrationsCreate: "integrations:create",
	IntegrationsUpdate: "integrations:update",
	IntegrationsDelete: "integrations:delete",
	IntegrationsRegenerate: "integrations:regenerate",
	SettingsRead: "settings:read",
	SettingsUpdate: "settings:update",
	LicenseUpdate: "license:update",
	CacheClear: "cache:clear",
} as const;

export type CorePermission = (typeof Permissions)[keyof typeof Permissions];

export type Permission =
	| CorePermission
	| `documents:${string}:${"read" | "create" | "update" | "delete" | "restore" | "publish" | "review"}`;
