import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import cacheKeys from "../../../libs/kv/cache-keys.js";
import {
	DocumentReferencesRepository,
	LocalesRepository,
} from "../../../libs/repositories/index.js";

const input = z.object({ localeCode: z.string().min(1) });

const deleteLocale: JobHandler<z.infer<typeof input>> = async ({
	context,
	input,
}) => {
	const Locales = new LocalesRepository(context.db);

	const deleteRes = await Locales.deleteSingle({
		where: [
			{
				key: "code",
				operator: "=",
				value: input.localeCode,
			},
		],
		returning: ["code"],
		validation: {
			enabled: true,
		},
	});
	if (deleteRes.error) return deleteRes;

	const DocumentReferences = new DocumentReferencesRepository(context.db);

	const removedReferences = await DocumentReferences.deleteByLocale({
		locale: input.localeCode,
	});
	if (removedReferences.error) return removedReferences;

	await context.kv.delete(context, {
		key: cacheKeys.http.static.contentLocales,
		hash: true,
	});

	return {
		error: undefined,
		data: undefined,
	};
};

/**
 * Deletes a single locale
 */
export const deleteLocaleJob = defineJob({
	name: "core:delete-locale",
	version: 1,
	input,
	handler: deleteLocale,
	describe: ({ input: { localeCode } }) => ({ localeCode }),
});
