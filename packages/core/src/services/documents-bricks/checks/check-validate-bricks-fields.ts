import constants from "../../../constants/constants.js";
import type BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import {
	evaluateFieldCondition,
	type FieldConditionTargetResolver,
} from "../../../libs/collection/custom-fields/conditions/index.js";
import type CustomField from "../../../libs/collection/custom-fields/custom-field.js";
import registeredFields from "../../../libs/collection/custom-fields/registered-fields.js";
import { isStorageMode } from "../../../libs/collection/custom-fields/storage/index.js";
import type {
	FieldConditionConfig,
	FieldConditionTranslationScope,
	FieldTypes,
	FieldUIConfig,
} from "../../../libs/collection/custom-fields/types.js";
import { copy } from "../../../libs/i18n/index.js";
import logger from "../../../libs/logger/index.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type {
	BrickError,
	ErrorCopy,
	FieldError,
	FieldInputSchema,
	GroupError,
} from "../../../types.js";
import { tenantAccessAllowed } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import fetchValidationData, {
	type ValidationData,
} from "../helpers/fetch-validation-data.js";

const isRequiredFieldConfig = (
	config: CustomField<FieldTypes>["config"],
): config is CustomField<FieldTypes>["config"] & {
	validation: { required?: boolean };
} => {
	return (
		"validation" in config &&
		typeof config.validation === "object" &&
		config.validation !== null
	);
};

/**
 * One level of submitted field input. The first entry is the level the field
 * being evaluated lives in, followed by each ancestor level up to the root.
 */
type ConditionScopeLevel = {
	treeParentKey?: string;
	fields: Array<FieldInputSchema>;
};

type ValidationMeta = {
	localized: boolean;
	defaultLocale: string;
	locales?: string[];
};

const getFieldCondition = (
	instance: CustomField<FieldTypes>,
): FieldConditionConfig | undefined => {
	return (instance.config as { ui?: FieldUIConfig }).ui?.condition;
};

/**
 * Maps field keys to the conditions of the structural containers they render
 * inside: the root tab they belong to plus any section/collapsible ancestors.
 * Structural fields are config-only containers, so submitted fields never
 * nest under them - hiding a container must hide its whole subtree.
 */
const buildStructuralConditions = (
	instance: CollectionBuilder | BrickBuilder,
): Map<string, FieldConditionConfig[]> => {
	const conditions = new Map<string, FieldConditionConfig[]>();
	let currentTabCondition: FieldConditionConfig | undefined;

	for (const [key, field] of instance.fields) {
		if (field.type === "tab") {
			currentTabCondition = getFieldCondition(field);
			continue;
		}

		const fieldConditions: FieldConditionConfig[] = [];

		if (field.treeParent === null && currentTabCondition) {
			fieldConditions.push(currentTabCondition);
		}

		let structuralParentKey = field.structuralParent;
		while (structuralParentKey) {
			const structuralParent = instance.fields.get(structuralParentKey);
			if (!structuralParent) break;

			const structuralCondition = getFieldCondition(structuralParent);
			if (structuralCondition) fieldConditions.push(structuralCondition);

			structuralParentKey = structuralParent.structuralParent;
		}

		if (fieldConditions.length > 0) {
			conditions.set(key, fieldConditions);
		}
	}

	return conditions;
};

/**
 * Resolves condition targets against submitted input. Field keys are unique
 * within a tree, so the target's own scope determines which level of the
 * chain its value is read from - targets outside the sibling/ancestor chain
 * stay unresolved.
 */
const createConditionTargetResolver = (props: {
	instance: CollectionBuilder | BrickBuilder;
	scopes: ConditionScopeLevel[];
	locale: string;
	defaultLocale: string;
	collectionLocalized: boolean;
	translationScope: FieldConditionTranslationScope;
}): FieldConditionTargetResolver => {
	return (fieldKey) => {
		const target = props.instance.fields.get(fieldKey);
		if (
			!target ||
			target.type === "repeater" ||
			target.type === "tab" ||
			target.type === "section" ||
			target.type === "collapsible"
		) {
			return { resolved: false };
		}

		const scope = props.scopes.find(
			(level) => (level.treeParentKey ?? null) === target.treeParent,
		);
		if (!scope) return { resolved: false };

		const submitted = scope.fields.find((field) => field.key === fieldKey);
		if (!submitted) {
			if (
				props.collectionLocalized &&
				target.localizedEnabled &&
				props.translationScope === "any"
			) {
				return { resolved: true, match: "any", values: [target.defaultValue] };
			}
			return { resolved: true, value: target.defaultValue };
		}

		if (
			submitted.translations &&
			props.collectionLocalized &&
			target.localizedEnabled
		) {
			if (props.translationScope === "any") {
				return {
					resolved: true,
					match: "any",
					values: Object.values(submitted.translations).map((value) =>
						target.normalizeInputValue(value),
					),
				};
			}

			const locale =
				props.translationScope === "default"
					? props.defaultLocale
					: props.locale;
			return {
				resolved: true,
				value: target.normalizeInputValue(submitted.translations[locale]),
			};
		}

		return {
			resolved: true,
			value: target.normalizeInputValue(submitted.value),
		};
	};
};

const getConditionTranslationScope = (
	condition: FieldConditionConfig,
	conditionedFieldLocalized: boolean,
): FieldConditionTranslationScope => {
	if (condition.translationScope && condition.translationScope !== "same") {
		return condition.translationScope;
	}

	return conditionedFieldLocalized ? "same" : "default";
};

/**
 * Evaluates whether a field is visible for the given locale, taking the
 * conditions of the structural containers it renders inside into account
 * (root tab plus any section/collapsible ancestors).
 */
const isFieldVisible = (props: {
	fieldKey: string;
	fieldInstance: CustomField<FieldTypes>;
	instance: CollectionBuilder | BrickBuilder;
	scopes: ConditionScopeLevel[];
	locale: string;
	defaultLocale: string;
	collectionLocalized: boolean;
	structuralConditions: Map<string, FieldConditionConfig[]>;
}): boolean => {
	const condition = getFieldCondition(props.fieldInstance);
	const containerConditions = props.structuralConditions.get(props.fieldKey);
	if (!condition && !containerConditions) return true;

	const evaluateCondition = (
		visibilityCondition: FieldConditionConfig,
		conditionedFieldLocalized: boolean,
	) =>
		evaluateFieldCondition(
			visibilityCondition,
			createConditionTargetResolver({
				instance: props.instance,
				scopes: props.scopes,
				locale: props.locale,
				defaultLocale: props.defaultLocale,
				collectionLocalized: props.collectionLocalized,
				translationScope: getConditionTranslationScope(
					visibilityCondition,
					conditionedFieldLocalized,
				),
			}),
		);

	for (const containerCondition of containerConditions ?? []) {
		if (!evaluateCondition(containerCondition, false)) {
			return false;
		}
	}

	return condition
		? evaluateCondition(condition, props.fieldInstance.localizedEnabled)
		: true;
};

const checkValidateBricksFields: ServiceFn<
	[
		{
			bricks: Array<BrickInputSchema>;
			fields: Array<FieldInputSchema>;
			collection: CollectionBuilder;
		},
	],
	undefined
> = async (context, data) => {
	const refDataRes = await fetchValidationData(context, data);
	if (refDataRes.error) return refDataRes;

	const brickErrors = validateBricks({
		bricks: data.bricks,
		collection: data.collection,
		validationData: refDataRes.data,
		defaultLocale: context.config.localization.defaultLocale,
		locales: context.config.localization.locales.map((locale) => locale.code),
		tenantKey: context.request.tenantKey,
	});
	const fieldErrors = recursiveFieldValidate({
		fields: data.fields,
		instance: data.collection,
		validationData: refDataRes.data,
		meta: {
			localized: data.collection.getData.localized,
			defaultLocale: context.config.localization.defaultLocale,
			locales: context.config.localization.locales.map((locale) => locale.code),
		},
	});

	if (brickErrors.length > 0 || fieldErrors.length > 0) {
		return {
			data: undefined,
			error: {
				type: "basic",
				name: copy("server:core.fields.validation.error.name"),
				message: copy("server:core.fields.validation.error.message"),
				status: 400,
				errors: {
					bricks: brickErrors,
					fields: fieldErrors,
				},
			},
		};
	}

	return {
		data: undefined,
		error: undefined,
	};
};

/**
 * Loops over bricks and runs validation against their fields recursively and return errors
 */
const validateBricks = (props: {
	bricks: Array<BrickInputSchema>;
	collection: CollectionBuilder;
	validationData: ValidationData;
	defaultLocale: string;
	locales: string[];
	tenantKey?: string | null;
}): Array<BrickError> => {
	const errors: BrickError[] = [];

	for (const brick of props.bricks) {
		let instance: BrickBuilder | undefined;

		switch (brick.type) {
			case "builder": {
				instance = props.collection.config.bricks?.builder?.find(
					(b) => b.key === brick.key,
				);
				break;
			}
			case "fixed": {
				instance = props.collection.config.bricks?.fixed?.find(
					(b) => b.key === brick.key,
				);
				break;
			}
		}

		if (
			!instance ||
			!tenantAccessAllowed(instance.config.tenants, props.tenantKey)
		) {
			logger.error({
				scope: constants.logScopes.validation,
				message: "Brick config was not found during document validation",
				data: {
					key: brick.key || "",
				},
			});
			errors.push({
				ref: brick.ref,
				key: brick.key,
				order: brick.order,
				fields: [
					{
						key: brick.key,
						localeCode: null,
						message: copy(
							"server:core.fields.lookup.not.found.in.collection.or.brick",
						),
					},
				],
			});
			continue;
		}

		const fieldErrors = recursiveFieldValidate({
			fields: brick.fields || [],
			instance: instance,
			validationData: props.validationData,
			meta: {
				localized: props.collection.getData.localized,
				defaultLocale: props.defaultLocale,
				locales: props.locales,
			},
		});
		if (fieldErrors.length === 0) continue;

		errors.push({
			ref: brick.ref,
			key: brick.key,
			order: brick.order,
			fields: fieldErrors,
		});
	}

	return errors;
};

/**
 * Recursively validate fields and return errors
 */
export const recursiveFieldValidate = (props: {
	fields: Array<FieldInputSchema>;
	instance: CollectionBuilder | BrickBuilder;
	validationData: ValidationData;
	parentTreeFieldKey?: string;
	parentScopes?: ConditionScopeLevel[];
	structuralConditions?: Map<string, FieldConditionConfig[]>;
	meta: ValidationMeta;
}) => {
	const errors: FieldError[] = [];

	const scopes: ConditionScopeLevel[] = [
		{ treeParentKey: props.parentTreeFieldKey, fields: props.fields },
		...(props.parentScopes ?? []),
	];
	const structuralConditions =
		props.structuralConditions ?? buildStructuralConditions(props.instance);
	const fieldVisibleForLocale = (
		fieldKey: string,
		fieldInstance: CustomField<FieldTypes>,
		locale: string,
	) =>
		isFieldVisible({
			fieldKey,
			fieldInstance,
			instance: props.instance,
			scopes,
			locale,
			defaultLocale: props.meta.defaultLocale,
			collectionLocalized: props.meta.localized,
			structuralConditions,
		});

	//*  validate all provided fields
	for (const field of props.fields) {
		const fieldInstance = props.instance.fields.get(field.key);
		if (!fieldInstance) {
			errors.push({
				key: field.key,
				localeCode: null,
				message: copy(
					"server:core.fields.lookup.not.found.in.collection.or.brick",
				),
			});
			continue;
		}
		const databaseConfig = registeredFields[fieldInstance.type].config.database;

		//* handle tree-table fields separately with recursive validation
		if (isStorageMode(databaseConfig, "tree-table")) {
			//* hidden containers skip validation for their entire subtree
			if (
				!fieldVisibleForLocale(
					field.key,
					fieldInstance,
					props.meta.defaultLocale,
				)
			) {
				continue;
			}

			const groupErrors: Array<GroupError> = [];
			const groups = field.groups || [];

			// validates the tree-table field and its group length
			const validationResult = fieldInstance.validate({
				type: field.type,
				value: groups,
			});
			if (!validationResult.valid) {
				errors.push({
					key: field.key,
					localeCode: null,
					message:
						validationResult.message ||
						copy(
							"server:core.fields.repeater.validation.field.contains.errors",
						),
				});
			}

			for (let i = 0; i < groups.length; i++) {
				const group = groups[i];
				if (!group) continue;

				const groupFieldErrors = recursiveFieldValidate({
					fields: group.fields,
					instance: props.instance,
					validationData: props.validationData,
					parentTreeFieldKey: field.key,
					parentScopes: scopes,
					structuralConditions,
					meta: props.meta,
				});

				if (groupFieldErrors.length > 0) {
					groupErrors.push({
						ref: group.ref,
						order: group.order || i,
						fields: groupFieldErrors,
					});
				}
			}

			if (groupErrors.length > 0) {
				errors.push({
					key: field.key,
					localeCode: null,
					message: copy(
						"server:core.fields.repeater.validation.field.contains.errors",
					),
					groupErrors: groupErrors,
				});
			}

			continue;
		}

		//* handle regular fields
		const fieldErrors = validateField({
			field: field,
			instance: fieldInstance,
			validationData: props.validationData,
			meta: props.meta,
			isLocaleVisible: (localeCode) =>
				fieldVisibleForLocale(
					field.key,
					fieldInstance,
					localeCode ?? props.meta.defaultLocale,
				),
		});
		if (fieldErrors.length > 0) {
			errors.push(...fieldErrors);
		}
	}

	//* check for required fields that are missing
	const submittedFieldKeys = new Set(props.fields.map((field) => field.key));
	props.instance.fields.forEach((fieldInstance, key) => {
		if (submittedFieldKeys.has(key)) return;

		//* skip fields that belong to a different tree-table parent context
		const fieldTreeParent = fieldInstance.treeParent;
		if (
			(fieldTreeParent && fieldTreeParent !== props.parentTreeFieldKey) ||
			(!fieldTreeParent && props.parentTreeFieldKey)
		) {
			return;
		}

		if (
			isRequiredFieldConfig(fieldInstance.config) &&
			fieldInstance.config.validation.required
		) {
			if (
				props.meta.localized &&
				fieldInstance.localizedEnabled &&
				props.meta.locales?.length
			) {
				for (const localeCode of getConfiguredLocaleCodes(props.meta)) {
					if (!fieldVisibleForLocale(key, fieldInstance, localeCode)) {
						continue;
					}

					errors.push({
						key: key,
						localeCode,
						message: copy("server:core.fields.validation.is.required"),
					});
				}
				return;
			}

			//* hidden fields are exempt from required validation
			if (
				!fieldVisibleForLocale(key, fieldInstance, props.meta.defaultLocale)
			) {
				return;
			}

			errors.push({
				key: key,
				localeCode: null,
				message: copy("server:core.fields.validation.is.required"),
			});
		}
	});

	return errors;
};

const getConfiguredLocaleCodes = (meta: ValidationMeta) => {
	const localeCodes = new Set(meta.locales ?? []);
	localeCodes.add(meta.defaultLocale);
	return Array.from(localeCodes);
};

const getTranslationLocaleCodes = (
	meta: ValidationMeta,
	translations: NonNullable<FieldInputSchema["translations"]>,
) => {
	const submittedLocaleCodes = Object.keys(translations);
	if (!meta.locales?.length) return submittedLocaleCodes;

	return Array.from(
		new Set([...getConfiguredLocaleCodes(meta), ...submittedLocaleCodes]),
	);
};

/**
 * Validates a single field, handling both direct values and translations
 */
export const validateField = (props: {
	field: FieldInputSchema;
	instance: CustomField<FieldTypes>;
	validationData: ValidationData;
	/**
	 * Visibility check for a given locale (null = the direct value branch).
	 * Hidden locales skip validation entirely.
	 */
	isLocaleVisible?: (localeCode: string | null) => boolean;
	meta: ValidationMeta;
}): FieldError[] => {
	const errors: FieldError[] = [];
	const refData = props.validationData[props.field.type];
	const fieldUsesTranslations =
		props.meta.localized && props.instance.localizedEnabled;
	const toFieldErrors = (localeCode: string | null, message?: ErrorCopy) => {
		return (
			message
				? [{ message }]
				: [
						{
							message: copy("server:core.fields.validation.errors.unknown"),
						},
					]
		).map((error) => ({
			key: props.field.key,
			localeCode,
			message: error.message,
		}));
	};
	const buildFieldErrors = (
		localeCode: string | null,
		validationResult: ReturnType<CustomField<FieldTypes>["validate"]>,
	) => {
		if (validationResult.errors?.length) {
			return validationResult.errors.map((error) => ({
				key: props.field.key,
				localeCode,
				message:
					error.message || copy("server:core.fields.validation.errors.unknown"),
				itemIndex: error.itemIndex,
			}));
		}

		return toFieldErrors(localeCode, validationResult.message);
	};

	//* handle fields with translations
	if (props.field.translations) {
		const localeCodes = fieldUsesTranslations
			? getTranslationLocaleCodes(props.meta, props.field.translations)
			: Object.keys(props.field.translations);

		for (const localeCode of localeCodes) {
			if (props.isLocaleVisible && !props.isLocaleVisible(localeCode)) {
				continue;
			}

			const value = props.field.translations[localeCode];
			const validationResult = props.instance.validate({
				type: props.field.type,
				value,
				refData: refData,
			});

			if (!validationResult.valid) {
				errors.push(...buildFieldErrors(localeCode, validationResult));
			}
		}
	}
	//* handle direct value fields
	else {
		if (fieldUsesTranslations && props.meta.locales?.length) {
			for (const localeCode of getConfiguredLocaleCodes(props.meta)) {
				if (props.isLocaleVisible && !props.isLocaleVisible(localeCode)) {
					continue;
				}

				const validationResult = props.instance.validate({
					type: props.field.type,
					value:
						localeCode === props.meta.defaultLocale
							? props.field.value
							: undefined,
					refData: refData,
				});

				if (!validationResult.valid) {
					errors.push(...buildFieldErrors(localeCode, validationResult));
				}
			}

			return errors;
		}

		if (props.isLocaleVisible && !props.isLocaleVisible(null)) {
			return errors;
		}

		const validationResult = props.instance.validate({
			type: props.field.type,
			value: props.field.value,
			refData: refData,
		});

		if (!validationResult.valid) {
			errors.push(
				...buildFieldErrors(
					fieldUsesTranslations ? props.meta.defaultLocale : null,
					validationResult,
				),
			);
		}
	}

	return errors;
};

export default checkValidateBricksFields;
