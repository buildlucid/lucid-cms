import constants from "../../../constants/constants.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import logger from "../../logger/index.js";
import createToolkit from "../../toolkit/create-toolkit.js";
import type { RegisteredJobSchedule } from "./registered-schedules.js";

/** Asks a schedule's `when` check whether a due occurrence is worth a job. A throw counts as no. */
const checkSchedule = async (
	context: ServiceContext,
	props: { binding: RegisteredJobSchedule; scheduledFor: string },
): Promise<boolean> => {
	const { when } = props.binding.schedule;
	if (!when) return true;

	try {
		return await when({
			context,
			toolkit: createToolkit(context),
			scheduledFor: props.scheduledFor,
		});
	} catch (error) {
		logger.warn({
			message: `The ${props.binding.key} schedule's check threw, so it didn't run`,
			scope: constants.logScopes.scheduler,
			data: {
				scheduledFor: props.scheduledFor,
				reason: error instanceof Error ? error.message : String(error),
			},
		});
		return false;
	}
};

export default checkSchedule;
