import type { TypesenseStatus } from "../toolkit/get-status/index.js";

/** One index's outcome in a CLI task: its status, or why it couldn't be read or rebuilt. */
export type IndexTaskResult =
	| { index: string; status: TypesenseStatus; error: null }
	| { index: string; status: null; error: string };
