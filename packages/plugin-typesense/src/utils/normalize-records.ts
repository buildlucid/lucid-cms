import { copy, z } from "@lucidcms/core";
import type { ServiceResponse } from "@lucidcms/core/types";
import type { IndexRecord, IndexValue } from "../types.js";
import { ownerId, recordId } from "./identity.js";

const indexValue: z.ZodType<IndexValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(indexValue),
		z.record(z.string(), indexValue.optional()),
	]),
);
const recordSchema = z
	.record(z.string(), indexValue.optional())
	.and(z.object({ id: z.string().min(1).optional() }))
	.refine(
		(record) => !Object.keys(record).some((name) => name.startsWith("_lucid_")),
	);

/** Validates projected records and assigns stable source-owned identities. */
const normalizeRecords = (data: {
	records: unknown;
	sourceKey: string;
	itemId: number;
	locale: string | null;
	revision: string;
	limit: number;
}): Awaited<ServiceResponse<IndexRecord[]>> => {
	const records: IndexRecord[] = [];
	const batch =
		data.records === null
			? []
			: Array.isArray(data.records)
				? data.records
				: [data.records];
	if (batch.length > data.limit) {
		return {
			error: {
				message: copy("server:plugin.typesense.projection.limit"),
			},
			data: undefined,
		};
	}
	const ids = new Set<string>();
	for (const candidate of batch) {
		const parsed = recordSchema.safeParse(candidate);
		if (!parsed.success) {
			return {
				error: {
					message: copy("server:plugin.typesense.projection.invalid"),
				},
				data: undefined,
			};
		}
		const id = parsed.data.id ?? "default";
		if (ids.has(id) || (batch.length > 1 && parsed.data.id === undefined)) {
			return {
				error: {
					message: copy("server:plugin.typesense.projection.identity"),
				},
				data: undefined,
			};
		}
		ids.add(id);
		records.push({
			...parsed.data,
			id: recordId({
				source: data.sourceKey,
				itemId: data.itemId,
				locale: data.locale,
				id,
			}),
			_lucid_owner: ownerId(data.sourceKey, data.itemId),
			_lucid_revision: data.revision,
		});
	}
	return { error: undefined, data: records };
};

export default normalizeRecords;
