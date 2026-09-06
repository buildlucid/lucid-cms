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
	/** Whether to call encode before storing values. */
	readonly encodes: boolean;
	/** Whether to call decode for selected results. */
	readonly decodes: boolean;
	/** Convert a domain value to the database representation. */
	encode(value: Decoded, context: CodecContext): Encoded;
	/** Convert a stored value back to the domain representation. */
	decode(value: Encoded, context: CodecContext): Decoded;
};
