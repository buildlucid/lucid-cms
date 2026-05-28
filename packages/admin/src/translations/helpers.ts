import type { ClientScope, Permission } from "@types";
import type { TranslationKeys } from "@/translations";

export const permissionKeyToTranslation = (permission: Permission) => {
	return `permissions.${permission.replaceAll(":", ".")}` as TranslationKeys;
};

export const clientScopeKeyToTranslation = (scope: ClientScope) => {
	return `client.scopes.${scope.replaceAll(":", ".")}` as TranslationKeys;
};
