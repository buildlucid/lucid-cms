import type {
	EmailStorageConcretePath,
	EmailStoragePathSegment,
} from "./types.js";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const cloneValue = <T>(value: T): T => {
	try {
		return structuredClone(value);
	} catch (_) {
		if (Array.isArray(value)) {
			return value.map((item) => cloneValue(item)) as T;
		}

		if (isRecord(value)) {
			return Object.fromEntries(
				Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
			) as T;
		}

		return value;
	}
};

/**
 * Resolves selector segments to concrete paths that already exist in data.
 */
export const resolveExistingEmailStoragePaths = (
	value: unknown,
	segments: EmailStoragePathSegment[],
	path: EmailStorageConcretePath = [],
): EmailStorageConcretePath[] => {
	if (segments.length === 0) return [path];

	const [segment, ...remainingSegments] = segments;
	if (!segment) return [path];

	if (segment.type === "key") {
		if (!isRecord(value) || !Object.hasOwn(value, segment.key)) return [];
		return resolveExistingEmailStoragePaths(
			value[segment.key],
			remainingSegments,
			[...path, segment.key],
		);
	}

	if (segment.type === "index") {
		if (!Array.isArray(value) || segment.index >= value.length) return [];
		return resolveExistingEmailStoragePaths(
			value[segment.index],
			remainingSegments,
			[...path, segment.index],
		);
	}

	if (!Array.isArray(value)) return [];

	return value.flatMap((item, itemIndex) =>
		resolveExistingEmailStoragePaths(item, remainingSegments, [
			...path,
			itemIndex,
		]),
	);
};

export const getValueAtEmailStoragePath = (
	value: unknown,
	path: EmailStorageConcretePath,
): unknown => {
	let current = value;

	for (const segment of path) {
		if (typeof segment === "number") {
			if (!Array.isArray(current)) return undefined;
			current = current[segment];
			continue;
		}

		if (!isRecord(current)) return undefined;
		current = current[segment];
	}

	return current;
};

export const setValueAtEmailStoragePath = (
	value: unknown,
	path: EmailStorageConcretePath,
	newValue: unknown,
	options?: {
		createMissing?: boolean;
	},
) => {
	if (path.length === 0) return;

	let current = value;
	for (let i = 0; i < path.length - 1; i++) {
		const segment = path[i];
		if (segment === undefined) return;

		const nextSegment = path[i + 1];

		if (typeof segment === "number") {
			if (!Array.isArray(current)) return;
			if (current[segment] === undefined && options?.createMissing) {
				current[segment] = typeof nextSegment === "number" ? [] : {};
			}
			current = current[segment];
			continue;
		}

		if (!isRecord(current)) return;
		if (current[segment] === undefined && options?.createMissing) {
			current[segment] = typeof nextSegment === "number" ? [] : {};
		}
		current = current[segment];
	}

	const finalSegment = path[path.length - 1];
	if (finalSegment === undefined) return;

	if (typeof finalSegment === "number") {
		if (!Array.isArray(current)) return;
		current[finalSegment] = newValue;
		return;
	}

	if (!isRecord(current)) return;
	current[finalSegment] = newValue;
};

export const removeValueAtEmailStoragePath = (
	value: unknown,
	path: EmailStorageConcretePath,
) => {
	if (path.length === 0) return;

	let current = value;
	for (let i = 0; i < path.length - 1; i++) {
		const segment = path[i];
		if (segment === undefined) return;

		if (typeof segment === "number") {
			if (!Array.isArray(current)) return;
			current = current[segment];
			continue;
		}

		if (!isRecord(current)) return;
		current = current[segment];
	}

	const finalSegment = path[path.length - 1];
	if (finalSegment === undefined) return;

	if (typeof finalSegment === "number") {
		if (!Array.isArray(current)) return;
		current[finalSegment] = null;
		return;
	}

	if (!isRecord(current)) return;
	delete current[finalSegment];
};

export const emailStorageSegmentsToPath = (
	segments: EmailStoragePathSegment[],
): EmailStorageConcretePath =>
	segments.map((segment) => {
		if (segment.type === "key") return segment.key;
		if (segment.type === "index") return segment.index;
		return 0;
	});
