import type { AdminSlot } from "@lucidcms/admin/types";

/**
 * Defines a component rendered into an admin slot. Add it to `config.admin.slots`.
 * Relative component paths resolve from lucid.config.
 *
 * @example
 * ```ts
 * const slugPreview = defineAdminSlot({
 * 	key: "slug-preview",
 * 	slot: "field.after",
 * 	match: { collection: "page", field: "slug" },
 * 	component: "./src/admin/SlugPreview.tsx",
 * });
 * ```
 */
const defineAdminSlot = (slot: AdminSlot): AdminSlot => slot;

export default defineAdminSlot;
