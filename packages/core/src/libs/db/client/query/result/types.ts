import type { ColumnDataType, OperationNode } from "kysely";
import type { DatabaseCodec } from "../../codecs/types.js";

/** Exact codecs to apply to named fields in one database result row. */
export type ResultPlan = Readonly<Record<string, ResultPlanEntry>>;

export type ResultPlanEntry = {
	codec?: DatabaseCodec;
	columnType?: ColumnDataType;
	nested?: ResultPlan;
	container?: "array" | "object";
};

/** Metadata attached by Lucid expression helpers before Kysely compilation. */
export type TaggedResult =
	| {
			kind: "codec";
			codec: DatabaseCodec;
	  }
	| {
			kind: "json-array";
			source: OperationNode;
	  };

export type CtePlans = ReadonlyMap<string, ResultPlan>;
