import type { DatabaseCodec } from "./types.js";

const identityCodec: DatabaseCodec = {
	name: "identity",
	encodes: false,
	decodes: false,
	encode: (value) => value,
	decode: (value) => value,
};

const booleanCodec: DatabaseCodec = {
	name: "boolean",
	encodes: true,
	decodes: false,
	encode: (value, context) => {
		if (value === null || value === undefined || typeof value !== "boolean") {
			return value;
		}

		return context.adapter.supports("boolean") ? value : value ? 1 : 0;
	},
	decode: (value) => value,
};

const integerCodec: DatabaseCodec = {
	name: "integer",
	encodes: true,
	decodes: false,
	encode: (value, context) => {
		if (typeof value !== "boolean") return value;
		return context.adapter.supports("boolean") ? value : value ? 1 : 0;
	},
	decode: (value) => value,
};

const jsonCodec: DatabaseCodec = {
	name: "json",
	encodes: true,
	decodes: true,
	encode: (value) => {
		if (value === null || value === undefined) return value;
		return JSON.stringify(value);
	},
	decode: (value, context) =>
		context.adapter.formatResultValue(
			context.columnType ?? context.adapter.getDataType("json"),
			value,
		),
};

/** Built-in codecs for common custom-table column types. */
export const codecs = {
	identity: identityCodec,
	boolean: booleanCodec,
	integer: integerCodec,
	json: jsonCodec,
} as const;
