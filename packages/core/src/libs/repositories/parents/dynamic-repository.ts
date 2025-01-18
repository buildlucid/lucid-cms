import BaseRepository from "./base-repository.js";
import type { LucidDB } from "../../db/types.js";
import type { ZodObject } from "zod";

abstract class DynamicRepository<
	Pattern extends keyof LucidDB,
	T extends LucidDB[Pattern] = LucidDB[Pattern],
> extends BaseRepository<Pattern, T> {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	public mergeSchema(schema?: ZodObject<any>) {
		if (!schema) return this.tableSchema;
		return this.tableSchema.merge(schema.shape);
	}
}

export default DynamicRepository;
