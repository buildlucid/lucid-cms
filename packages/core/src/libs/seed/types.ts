import type { ServiceContext } from "../../utils/services/types.js";
import type { Toolkit } from "../toolkit/types.js";

/** Repeatable async seed using the current service context. Throw on failure. */
export type Seed = (args: {
	context: ServiceContext;
	toolkit: Toolkit;
}) => Promise<void>;

/** Seed name and callback. Use a plugin namespace such as catalog:example to avoid collisions. */
export type SeedDefinition = { name: string; seed: Seed };
