import type z from "zod";
import type LucidAdapterSchema from "./schema.js";

export type LucidAdapterResponse = z.infer<typeof LucidAdapterSchema>;
