import type { ServiceContext } from "../../utils/services/types.js";
import type { Toolkit } from "../toolkit/types.js";

/** A repeatable seed created with `defineSeed`. */
export type Seed = {
	/** Writes the seed's data. It may run more than once. Throw on failure. */
	run: (args: {
		context: ServiceContext;
		toolkit: Toolkit;
	}) => void | Promise<void>;
};

/** Seed name and definition. Use a plugin namespace such as catalog:example to avoid collisions. */
export type SeedDefinition = { name: string; seed: Seed };
