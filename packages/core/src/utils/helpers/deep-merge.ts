type MergeObject = Record<string, unknown>;

const isMergeObject = (value: unknown): value is MergeObject => {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};

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

	if (isMergeObject(sourceValue)) {
		const targetObject = isMergeObject(targetValue) ? targetValue : {};
		return deepMerge(targetObject, sourceValue);
	}

	return sourceValue;
};

const deepMerge = <Target extends object, Source extends object>(
	target: Target,
	source: Source,
) => {
	const targetObject = target as MergeObject;

	for (const [key, sourceValue] of Object.entries(source)) {
		targetObject[key] = mergeValue(targetObject[key], sourceValue);
	}

	return target as Target & Source;
};

export default deepMerge;
