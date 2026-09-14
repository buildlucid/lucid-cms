import { copy } from "@lucidcms/core";
import type { Media, ServiceFn } from "@lucidcms/core/types";
import type { IndexRecord, MediaSource } from "../types.js";
import normalizeRecords from "../utils/normalize-records.js";

const translatedFields = new Set(["title", "alt", "description", "summary"]);

/** Projects ready media using Lucid's current file and crop formatting. */
const projectMedia: ServiceFn<
	[
		{
			source: MediaSource;
			media: Media[];
			revision: string;
			maxRecordsPerItem: number;
		},
	],
	IndexRecord[]
> = async (_context, data) => {
	const records: IndexRecord[] = [];
	const selections = Object.entries(data.source.fields ?? {});
	try {
		for (const media of data.media) {
			if (
				media.isDeleted ||
				media.status !== "ready" ||
				(data.source.visibility !== "all" && !media.public)
			) {
				continue;
			}

			const values: Record<string, unknown> = { ...media };
			for (const locale of data.source.locales ?? [null]) {
				const input = { media, locale };
				if (data.source.condition && !data.source.condition(input)) continue;
				const projected: unknown = data.source.project
					? data.source.project(input)
					: Object.fromEntries(
							selections.map(([name, selection]) => {
								if (typeof selection === "function") {
									return [name, selection(input)];
								}
								const value = values[selection];
								return [
									name,
									locale !== null &&
									translatedFields.has(selection) &&
									value !== null &&
									typeof value === "object" &&
									!Array.isArray(value)
										? Object.entries(value).find(([key]) => key === locale)?.[1]
										: value,
								];
							}),
						);

				const normalized = normalizeRecords({
					records: projected,
					sourceKey: data.source.key,
					itemId: media.id,
					locale,
					revision: data.revision,
					limit: data.maxRecordsPerItem,
				});
				if (normalized.error) return normalized;
				records.push(...normalized.data);
			}
		}
	} catch {
		return {
			error: { message: copy("server:plugin.typesense.projection.failed") },
			data: undefined,
		};
	}

	return { error: undefined, data: records };
};

export default projectMedia;
