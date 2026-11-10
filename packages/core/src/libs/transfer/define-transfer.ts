import type { TransferEntry } from "@lucidcms/types";
import type { TransferDefinition, TransferDefinitionInput } from "./types.js";

/**
 * Defines how one kind of record is exported and imported, for data in custom tables, eg. a
 * plugin's. Register it with `transfers` in config. Data in collections is covered by documents already.
 *
 * @example
 * ```ts
 * const bookingsTransfer = defineTransfer({
 *   key: "@acme/lucid-bookings",
 *   label: { singular: "Booking", plural: "Bookings" },
 *   entry: z.object({ uid: z.string(), date: z.string() }),
 *   selection: z.array(z.number()).transform((ids) => ids.map(String)),
 *   identify: async ({ context, ids }) => new Map(),
 *   match: async ({ context, uids }) => new Map(),
 *   export: async ({ context, ids }) => [],
 *   import: async ({ context, entry, existing }) => ({
 *     status: existing ? "updated" : "created",
 *     id: null,
 *     warnings: [],
 *   }),
 * });
 *
 * // lucid.config.ts
 * export default defineConfig({
 *   config: () => ({ transfers: [bookingsTransfer] }),
 * });
 *
 * // or from a plugin
 * definePlugin({
 *   key: "@acme/lucid-bookings",
 *   configure: (draft) => {
 *     draft.transfers.push(bookingsTransfer);
 *   },
 * });
 * ```
 */
const defineTransfer = <
	const TKey extends string,
	TEntry extends TransferEntry,
	TSelection = never,
>(
	definition: TransferDefinitionInput<TKey, TEntry, TSelection>,
): TransferDefinition<TKey, TEntry, TSelection> => ({
	...definition,
	type: "transfer-definition",
});

export default defineTransfer;
