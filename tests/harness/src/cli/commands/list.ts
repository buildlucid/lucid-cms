import lanes from "../../lanes/get-lanes.ts";
import { loadSetups } from "../../setup/load-setups.ts";
import createPlan from "../create-plan.ts";
import type { PlanFilters } from "../types.ts";

/**
 * Prints what a run would do. With `json` it prints the setup names as a JSON array, which CI
 * turns into one job per setup.
 */
const listCommand = async (
	options: PlanFilters & { json: boolean },
): Promise<number> => {
	const plans = createPlan({
		setups: await loadSetups(),
		lanes,
		filters: options,
	});

	if (options.json) {
		console.log(JSON.stringify(plans.map((plan) => plan.setup.name)));
		return 0;
	}

	console.log("Setups\n");
	for (const { setup, jobs } of plans) {
		console.log(`  ${setup.name}\n    ${setup.description}`);
		for (const job of jobs) {
			console.log(`    - ${job.lane.key} (${job.mode})`);
		}
		console.log("");
	}

	console.log("Lanes\n");
	for (const lane of lanes) {
		console.log(`  ${lane.key}: ${lane.description}`);
	}
	return 0;
};

export default listCommand;
