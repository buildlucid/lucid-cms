import type { Permission } from "@types";
import type { TranslationKeys } from "@/translations";

export const permissionKeyToTranslation = (permission: Permission) => {
	return `permissions.${permission.replaceAll(":", ".")}` as TranslationKeys;
};

export const clientScopeKeyToTranslation = (scope: string) => {
	return `client.scopes.${scope.replaceAll(":", ".")}` as TranslationKeys;
};
