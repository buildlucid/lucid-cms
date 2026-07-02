import {
	evaluateFieldCondition,
	type FieldConditionConfig,
	type FieldConditionTargetResolution,
	type FieldConditionTranslationScope,
} from "@field-conditions";
import type { InternalDocumentField } from "@types";
import brickStore from "@/store/brickStore";
import type {
	CollectionFieldConfig,
	CollectionLeafFieldConfig,
} from "@/types/collection-config";

/**
 * One level of the field tree a condition can resolve targets against. The
 * first entry is the level the field lives in (its direct siblings), followed
 * by each ancestor repeater level up to the brick/collection root.
 */
export interface FieldConditionScope {
	configFields: CollectionFieldConfig[];
	fields: InternalDocumentField[];
}

/**
 * Tabs are transparent for condition scoping - their fields belong to the
 * root level, both in config and in the submitted field data.
 */
export const flattenTabScopeConfigs = (
	configs: CollectionFieldConfig[],
): CollectionFieldConfig[] => {
	return configs.flatMap((config) =>
		config.type === "tab" ? config.fields : [config],
	);
};

const isLeafFieldConfig = (
	config: CollectionFieldConfig,
): config is CollectionLeafFieldConfig => {
	return config.type !== "repeater" && config.type !== "tab";
};

const resolveTargetInScopes = (
	scopes: FieldConditionScope[],
	fieldKey: string,
	contentLocale: string,
	defaultLocale: string,
	translationScope: FieldConditionTranslationScope,
): FieldConditionTargetResolution => {
	for (const scope of scopes) {
		const config = scope.configFields.find((c) => c.key === fieldKey);
		if (!config) continue;
		if (!isLeafFieldConfig(config)) return { resolved: false };

		const data = scope.fields.find((f) => f.key === fieldKey);
		if (!data) {
			if (
				config.localized === true &&
				brickStore.get.collectionLocalized === true &&
				translationScope === "any"
			) {
				return { resolved: true, match: "any", values: [config.default] };
			}
			return { resolved: true, value: config.default };
		}

		if (
			config.localized === true &&
			brickStore.get.collectionLocalized === true
		) {
			if (translationScope === "any") {
				return {
					resolved: true,
					match: "any",
					values: data.translations
						? Object.values(data.translations)
						: data.value !== undefined
							? [data.value]
							: [],
				};
			}

			const locale =
				translationScope === "default"
					? defaultLocale
					: contentLocale || defaultLocale;
			return { resolved: true, value: data.translations?.[locale] };
		}

		return { resolved: true, value: data.value };
	}

	return { resolved: false };
};

const getConditionTranslationScope = (
	condition: FieldConditionConfig,
	fieldConfig: CollectionFieldConfig,
): FieldConditionTranslationScope => {
	if (condition.translationScope && condition.translationScope !== "same") {
		return condition.translationScope;
	}

	if (isLeafFieldConfig(fieldConfig) && fieldConfig.localized === true) {
		return "same";
	}

	return "default";
};

const evaluateConditionForField = (props: {
	condition: FieldConditionConfig;
	fieldConfig: CollectionFieldConfig;
	scopes: FieldConditionScope[];
	contentLocale: string;
	defaultLocale: string;
}): boolean => {
	const translationScope = getConditionTranslationScope(
		props.condition,
		props.fieldConfig,
	);

	return evaluateFieldCondition(props.condition, (fieldKey) =>
		resolveTargetInScopes(
			props.scopes,
			fieldKey,
			props.contentLocale,
			props.defaultLocale,
			translationScope,
		),
	);
};

/**
 * Evaluates a field's own `ui.condition` against its scope chain. Ancestor
 * visibility is not checked here - hidden containers simply don't render
 * their subtree.
 */
export const evaluateFieldVisibility = (props: {
	fieldConfig: CollectionFieldConfig;
	scopes: FieldConditionScope[];
	contentLocale: string;
	defaultLocale: string;
}): boolean => {
	const condition = props.fieldConfig.ui?.condition;
	if (!condition) return true;

	return evaluateConditionForField({
		condition,
		fieldConfig: props.fieldConfig,
		scopes: props.scopes,
		contentLocale: props.contentLocale,
		defaultLocale: props.defaultLocale,
	});
};
