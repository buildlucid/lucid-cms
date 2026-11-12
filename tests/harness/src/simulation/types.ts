import type fc from "fast-check";
import type { Lucid } from "../client/open-lucid.ts";
import type { Session } from "../client/types.ts";
import type { Variant } from "../setup/variants.ts";
import type { AdapterOverrides } from "../targets/types.ts";

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
	/** Does it to the CMS and updates the model to match. */
	run: (context: SimulationContext<Model> & { input: Input }) => Promise<void>;
};

/** An action with its input already chosen, ready to run. */
export type Step<Model> = {
	name: string;
	when: (model: Model) => boolean;
	run: (context: SimulationContext<Model>) => Promise<void>;
};

export type SimulationDefinition<Model> = {
	/** Creates the empty model that matches a freshly seeded CMS. */
	model: () => Model;
	/**
	 * Runs at the start of each sequence, once the CMS is open, such as to create the users its
	 * actions work with. It updates the model to match.
	 */
	setup?: (context: SimulationContext<Model>) => Promise<void>;
	/**
	 * The actions a sequence is built from. Make each with `action()`. An action listed more than
	 * once is picked more often. An action that moves toward a state needing several steps, such as
	 * a request's second approval, can choose only from what is ready for it, so sequences get there.
	 */
	actions: fc.Arbitrary<Step<Model>>[];
	/** Rules that must hold after every action, keyed by a description. Each one throws when broken. */
	invariants: Record<
		string,
		(context: SimulationContext<Model>) => Promise<void>
	>;
	/**
	 * Runs once a sequence's actions are done, before its invariants are checked one last time,
	 * such as to stop faults and let every job finish. It throws when what it waits for never happens.
	 */
	settle?: (context: SimulationContext<Model>) => Promise<void>;
	/** The longest sequence to try. Defaults to 20. */
	maxActions?: number;
	/**
	 * Replaces adapters to inject faults, such as a queue that fails. `random` gives numbers from
	 * 0 to 1 that follow the run's seed, so the same faults happen on a replay. `cms.uploads` is
	 * where the CMS stores uploads, for storage that wraps the real one. `model` is the sequence's
	 * model, for adapters its actions drive, such as a queue they deliver from.
	 */
	adapters?: (
		random: () => number,
		cms: { uploads: string },
		model: Model,
	) => AdapterOverrides | Promise<AdapterOverrides>;
	/** Runs every sequence on a variant of the setup's config. See `setup/variants.ts`. */
	variant?: Variant;
};
