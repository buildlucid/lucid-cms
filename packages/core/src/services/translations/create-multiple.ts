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

	const TranslationKeysRepo = Repository.get(
		"translation-keys",
		context.db,
		context.config.db,
	);

	const translationKeyEntries = await TranslationKeysRepo.createMultiple(
		data.keys.map((k) => ({ createdAt: new Date().toISOString() })),
	);

	if (translationKeyEntries.length !== data.keys.length) {
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
			const translationKeyId = translationKeyEntries[index]?.id;
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

	const TranslationsRepo = Repository.get(
		"translations",
		context.db,
		context.config.db,
	);

	await TranslationsRepo.upsertMultiple(
		data.translations.map((translation) => {
			return {
				translationKeyId: keys[translation.key],
				localeCode: translation.localeCode,
				value: translation.value,
			};
		}),
	);

	return {
		error: undefined,
		data: keys,
	};
};

export default createMultiple;
