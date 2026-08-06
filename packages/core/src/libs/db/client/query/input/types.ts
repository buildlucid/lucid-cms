import type { CodecContext, DatabaseCodec } from "../../codecs/types.js";
import type { ResultPlan } from "../result/plan.js";

export type InputSource = { tableName?: string; plan?: ResultPlan };
export type InputSourceMap = Map<string, InputSource>;

export type CodecTarget = {
	codec: DatabaseCodec;
	columnType?: CodecContext["columnType"];
};
