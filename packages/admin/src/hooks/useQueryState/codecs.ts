import type {
	FilterCodec,
	FilterValue,
	PaginationCodec,
	SortCodec,
	SortDirection,
} from "./types";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 10;

//* coerce numeric strings to numbers so array/number filters round-trip from the URL
const coerceNumeric = (raw: string): string | number => {
	if (raw.trim() === "") return raw;
	const asNumber = Number(raw);
	return Number.isNaN(asNumber) ? raw : asNumber;
};

const isBlank = (value: FilterValue): boolean => {
	if (value === undefined) return true;
	if (typeof value === "string") return value.trim() === "";
	return false;
};

export const textFilter = (config?: {
	defaultValue?: string;
	defaultOperator?: string;
}): FilterCodec => {
	const normalize = (value: FilterValue): FilterValue => {
		if (value === undefined) return undefined;
		if (Array.isArray(value)) return value.join(",");
		return value;
	};
	const serialize = (value: FilterValue): string | undefined => {
		const normalized = normalize(value);
		if (isBlank(normalized)) return undefined;
		return String(normalized);
	};
	return {
		kind: "filter",
		type: "text",
		defaultValue: config?.defaultValue ?? "",
		defaultOperator: config?.defaultOperator,
		parse: (raw) => raw,
		serialize,
		isEmpty: (value) => serialize(value) === undefined,
		equals: (a, b) => {
			const left = serialize(a);
			const right = serialize(b);
			return left === right;
		},
		normalize,
	};
};

export const numberFilter = (config?: {
	defaultValue?: number;
	defaultOperator?: string;
}): FilterCodec => {
	const normalize = (value: FilterValue): FilterValue => {
		if (value === undefined) return undefined;
		if (typeof value === "string") {
			if (value.trim() === "") return undefined;
			return coerceNumeric(value);
		}
		if (Array.isArray(value)) return undefined;
		if (typeof value === "boolean") return value ? 1 : 0;
		return value;
	};
	const serialize = (value: FilterValue): string | undefined => {
		const normalized = normalize(value);
		if (normalized === undefined) return undefined;
		return String(normalized);
	};
	return {
		kind: "filter",
		type: "number",
		defaultValue: config?.defaultValue,
		defaultOperator: config?.defaultOperator,
		parse: (raw) => (raw === "" ? undefined : coerceNumeric(raw)),
		serialize,
		isEmpty: (value) => serialize(value) === undefined,
		equals: (a, b) => serialize(a) === serialize(b),
		normalize,
	};
};

export const booleanFilter = (config?: {
	defaultValue?: boolean;
	defaultOperator?: string;
}): FilterCodec => {
	const normalize = (value: FilterValue): FilterValue => {
		if (typeof value === "boolean") return value;
		if (value === "1" || value === 1) return true;
		if (value === "0" || value === 0) return false;
		return undefined;
	};
	const serialize = (value: FilterValue): string | undefined => {
		const normalized = normalize(value);
		if (normalized === undefined) return undefined;
		return normalized ? "1" : "0";
	};
	return {
		kind: "filter",
		type: "boolean",
		defaultValue: config?.defaultValue,
		defaultOperator: config?.defaultOperator,
		parse: (raw) => {
			if (raw === "1") return true;
			if (raw === "0") return false;
			return undefined;
		},
		serialize,
		isEmpty: (value) => serialize(value) === undefined,
		equals: (a, b) => normalize(a) === normalize(b),
		normalize,
	};
};

export const arrayFilter = (config?: {
	defaultValue?: (string | number)[];
	defaultOperator?: string;
}): FilterCodec => {
	const normalize = (value: FilterValue): FilterValue => {
		if (value === undefined) return [];
		if (Array.isArray(value)) return value;
		if (typeof value === "boolean") return [value ? 1 : 0];
		if (typeof value === "string" && value.trim() === "") return [];
		return [value];
	};
	const serialize = (value: FilterValue): string | undefined => {
		const normalized = normalize(value) as (string | number)[];
		const values = normalized.filter((item) => String(item).trim().length > 0);
		return values.length ? values.join(",") : undefined;
	};
	return {
		kind: "filter",
		type: "array",
		defaultValue: config?.defaultValue ?? [],
		defaultOperator: config?.defaultOperator,
		parse: (raw) => {
			if (raw === "") return [];
			return raw.split(",").map(coerceNumeric);
		},
		serialize,
		isEmpty: (value) => serialize(value) === undefined,
		equals: (a, b) => {
			const left = normalize(a) as (string | number)[];
			const right = normalize(b) as (string | number)[];
			if (left.length !== right.length) return false;
			return left.every((item, index) => String(item) === String(right[index]));
		},
		normalize,
	};
};

export const sort = (config?: { defaultValue?: SortDirection }): SortCodec => ({
	kind: "sort",
	defaultValue: config?.defaultValue,
});

export const pagination = (config?: {
	defaultPage?: number;
	defaultPerPage?: number;
}): PaginationCodec => ({
	kind: "pagination",
	defaultPage: config?.defaultPage ?? DEFAULT_PAGE,
	defaultPerPage: config?.defaultPerPage ?? DEFAULT_PER_PAGE,
});
