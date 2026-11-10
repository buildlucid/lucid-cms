import {
	type UseExtensionTranslation,
	useTranslation as useAdminTranslation,
} from "../hooks/useTranslation/useTranslation.js";
export { Permissions } from "../constants/permissions.js";
export { useAdminConfig } from "../hooks/useAdminConfig/useAdminConfig.js";
export { useDocumentEditor } from "../hooks/useDocumentEditor/useDocumentEditor.js";
export { usePageTitle } from "../hooks/usePageTitle/usePageTitle.js";
export { usePermissions } from "../hooks/usePermissions/usePermissions.js";
export * from "../hooks/useQueryState/useQueryState.js";
export { default as useQueryState } from "../hooks/useQueryState/useQueryState.js";
export { useSession } from "../hooks/useSession/useSession.js";
export {
	type TableRowId,
	type TableSelection,
	useTableSelection,
} from "../hooks/useTableSelection/useTableSelection.js";
export type {
	ExtensionTranslationKey as TranslationKey,
	TranslationRegistry,
} from "../hooks/useTranslation/useTranslation.js";
export const useTranslation: UseExtensionTranslation = useAdminTranslation;
