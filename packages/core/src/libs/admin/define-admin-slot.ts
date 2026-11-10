import type { AdminSlot } from "@lucidcms/admin/types";
import type { ExactDefinition, SlotVariant } from "./types.js";

/**
 * Defines a component rendered into an admin slot. Add it to `config.admin.slots`.
 * Relative component paths resolve from lucid.config. Type the component with
 * `SlotComponent<typeof slugPreview>`, so its props follow this definition.
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
const defineAdminSlot = <const TSlot extends AdminSlot>(
	slot: ExactDefinition<TSlot, SlotVariant<AdminSlot, TSlot["slot"]>>,
): TSlot => slot;

export default defineAdminSlot;
