import Repository from "../../libs/repositories/index.js";
import type {
	ServiceFn,
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";

export interface ServiceData<K extends string> {
	keys: K[];
	translations: Array<{
		value: string | null;
		localeCode: string;
		key: K;
	}>;
}

const createMultiple: ServiceFn<
	[ServiceData<string>],
	Record<string, number>
> = async <K extends string>(
	context: ServiceContext,
	data: ServiceData<K>,
): ServiceResponse<Record<K, number>> => {
	if (data.keys.length === 0) {
		return {
			error: {
				type: "basic",
				status: 400,
			},
			data: undefined,
		};
	}

	const TranslationKeys = Repository.get(
		"translation-keys",
		context.db,
		context.config.db,
	);

	const translationKeyRes = await TranslationKeys.createMultiple({
		data: data.keys.map((k) => ({ created_at: new Date().toISOString() })),
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (translationKeyRes.error) return translationKeyRes;

	if (translationKeyRes.data.length !== data.keys.length) {
		return {
			error: {
				type: "basic",
				status: 400,
			},
			data: undefined,
		};
	}

	const keys: Record<K, number> = data.keys.reduce(
		(keys, key, index) => {
			const translationKeyId = translationKeyRes.data[index]?.id;
			if (translationKeyId === undefined) {
				return keys;
			}
			keys[key] = translationKeyId;
			return keys;
		},
		{} as Record<K, number>,
	);

	if (data.translations.length === 0) {
		return {
			error: undefined,
			data: keys,
		};
	}

	const Translations = Repository.get(
		"translations",
		context.db,
		context.config.db,
	);

	const translationsRes = await Translations.upsertMultiple({
		data: data.translations.map((translation) => {
			return {
				translation_key_id: keys[translation.key],
				locale_code: translation.localeCode,
				value: translation.value,
			};
		}),
		where: [],
	});
	if (translationsRes.error) return translationsRes;

	return {
		error: undefined,
		data: keys,
	};
};

export default createMultiple;
