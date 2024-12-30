import {
	shouldUpdateTranslations,
	mergeTranslationGroups,
	getUniqueLocaleCodes,
} from "../../utils/translations/index.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";
import type { TranslationsObj } from "../../types/shared.js";

export interface ServiceData<K extends string> {
	keys: Record<K, number | null>;
	items: Array<{
		translations: TranslationsObj[];
		key: K;
	}>;
}

const upsertMultiple: ServiceFn<[ServiceData<string>], undefined> = async <
	K extends string,
>(
	context: ServiceContext,
	data: ServiceData<K>,
) => {
	if (shouldUpdateTranslations(data.items.map((item) => item.translations))) {
		const localeExistsRes =
			await context.services.locale.checks.checkLocalesExist(context, {
				localeCodes: getUniqueLocaleCodes(
					data.items.map((item) => item.translations || []),
				),
			});
		if (localeExistsRes.error) return localeExistsRes;

		const translations = mergeTranslationGroups<K>(data.items)
			.map((translation) => {
				return {
					value: translation.value ?? "",
					localeCode: translation.localeCode,
					translationKeyId: data.keys[translation.key] as number,
				};
			})
			.filter((translation) => translation.translationKeyId !== null);

		if (translations.length === 0) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const TranslationsRepo = Repository.get(
			"translations",
			context.db,
			context.config.db,
		);

		await TranslationsRepo.upsertMultiple(translations);

		return {
			error: undefined,
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default upsertMultiple;
