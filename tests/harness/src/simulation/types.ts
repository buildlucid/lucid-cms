import type fc from "fast-check";
import type { Variant } from "../../../shared/variants.ts";
import type { Lucid } from "../client/open-lucid.ts";
import type { Session } from "../client/types.ts";
import type { AdapterOverrides } from "../targets/types.ts";
import type { JsonValue } from "../utils/json.ts";

/** What an action or invariant works with: the CMS, and the model of what it should now hold. */
export type SimulationContext<Model> = {
	model: Model;
	lucid: Lucid;
	/** A session signed in as the seeded admin. */
	admin: Session;
};

/** One thing a user could do, such as creating a page. */
export type ActionDefinition<Model, Input> = {
	name: string;
	/** Generates the action's input. Leave it out for actions that need none. */
	input?: fc.Arbitrary<Input>;
	/** Whether the action makes sense in the current state. Defaults to always. */
	when?: (model: Model) => boolean;
	/**
	 * Does it to the CMS and updates the model to match.
	 * What it returns is recorded, and must be the same on every setup for the same seed.
	 */
	run: (
		context: SimulationContext<Model> & { input: Input },
	) => Promise<JsonValue | void>;
};

/** An action with its input already chosen, ready to run. */
export type Step<Model> = {
	name: string;
	input: JsonValue;
	when: (model: Model) => boolean;
	run: (context: SimulationContext<Model>) => Promise<JsonValue | void>;
};

export type SimulationDefinition<Model> = {
	/** Creates the empty model that matches a freshly seeded CMS. */
	model: () => Model;
	/**
	 * Runs at the start of each sequence, once the CMS is open, such as to create the users its
	 * actions work with. It updates the model to match.
	 */
	setup?: (context: SimulationContext<Model>) => Promise<void>;
	/** The actions a sequence is built from. Make each with `action()`. */
	actions: fc.Arbitrary<Step<Model>>[];
	/** Rules that must hold after every action, keyed by a description. Each one throws when broken. */
	invariants: Record<
		string,
		(context: SimulationContext<Model>) => Promise<void>
	>;
	/** The longest sequence to try. Defaults to 20. */
	maxActions?: number;
	/**
	 * Replaces adapters to inject faults, such as a queue that fails. `random` gives numbers from
	 * 0 to 1 that follow the run's seed, so the same faults happen on a replay. `cms.uploads` is
	 * where the CMS stores uploads, for storage that wraps the real one.
	 */
	adapters?: (
		random: () => number,
		cms: { uploads: string },
	) => AdapterOverrides | Promise<AdapterOverrides>;
	/** Runs every sequence on a variant of the setup's config. See `shared/variants.ts`. */
	variant?: Variant;
};
