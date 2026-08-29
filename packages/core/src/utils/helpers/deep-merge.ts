import isPlainObject from "./is-plain-object.js";

type MergeObject = Record<PropertyKey, unknown>;

const mergeValue = (targetValue: unknown, sourceValue: unknown): unknown => {
	if (sourceValue === undefined) {
		return targetValue;
	}

	if (Array.isArray(sourceValue)) {
		const targetArray = Array.isArray(targetValue) ? targetValue : [];

		sourceValue.forEach((item, index) => {
			targetArray[index] = mergeValue(targetArray[index], item);
		});

		return targetArray;
	}

	if (isPlainObject(sourceValue)) {
		const targetObject = isPlainObject(targetValue) ? targetValue : {};
		return deepMerge(targetObject, sourceValue);
	}

	return sourceValue;
};

const deepMerge = <Target extends object, Source extends object>(
	target: Target,
	source: Source,
) => {
	const targetObject = target as MergeObject;
	const sourceObject = source as MergeObject;

	for (const key of Reflect.ownKeys(source)) {
		const sourceValue = sourceObject[key];
		targetObject[key] = mergeValue(targetObject[key], sourceValue);
	}

	return target as Target & Source;
};

export default deepMerge;
