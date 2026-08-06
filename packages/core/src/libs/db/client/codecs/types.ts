import type { ColumnDataType } from "kysely";
import type DatabaseAdapter from "../../adapter-base.js";

export type CodecContext = {
	adapter: DatabaseAdapter;
	/** Adapter-resolved physical type when the value belongs to a declared column. */
	columnType?: ColumnDataType;
};

/** Formats one column's inputs and selected results at the database boundary. */
export type DatabaseCodec<Decoded = unknown, Encoded = unknown> = {
	readonly name: string;
	readonly encodes: boolean;
	readonly decodes: boolean;
	encode(value: Decoded, context: CodecContext): Encoded;
	decode(value: Encoded, context: CodecContext): Decoded;
};
