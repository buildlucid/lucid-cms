import type { ClientScope, Permission } from "@types";
import type { TranslationKeys } from "@/translations";

export const permissionKeyToTranslation = (permission: Permission) => {
	return `permissions_${permission.replaceAll(":", "_")}` as TranslationKeys;
};

export const clientScopeKeyToTranslation = (scope: ClientScope) => {
	return `client_scopes_${scope.replaceAll(":", "_")}` as TranslationKeys;
};
