import z from "zod";
import { ResourceSourcesSchema } from "../resources/schema.js";
import type { LucidPluginDefinition } from "./types.js";

const callback = <Callback>() =>
	z.custom<Callback>((value) => typeof value === "function");

export const PluginDefinitionSchema: z.ZodType<LucidPluginDefinition> =
	z.strictObject({
		key: z.string().trim().min(1),
		lucid: z.string().trim().min(1),
		sources: ResourceSourcesSchema.optional(),
		defaults: z
			.custom<LucidPluginDefinition["defaults"]>(
				(value) =>
					typeof value === "function" ||
					(!!value && typeof value === "object" && !Array.isArray(value)),
			)
			.optional(),
		configure:
			callback<NonNullable<LucidPluginDefinition["configure"]>>().optional(),
		checkCompatibility:
			callback<
				NonNullable<LucidPluginDefinition["checkCompatibility"]>
			>().optional(),
		toolkit: z
			.custom<LucidPluginDefinition["toolkit"]>(
				(value) =>
					!!value &&
					typeof value === "object" &&
					"create" in value &&
					typeof value.create === "function",
			)
			.optional(),
		hooks: z
			.strictObject({
				init: callback<
					NonNullable<LucidPluginDefinition["hooks"]>["init"]
				>().optional(),
				runtime:
					callback<
						NonNullable<LucidPluginDefinition["hooks"]>["runtime"]
					>().optional(),
			})
			.optional(),
	});
