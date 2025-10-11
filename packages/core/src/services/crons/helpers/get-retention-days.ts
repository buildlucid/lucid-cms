import { subDays } from "date-fns";
import type { Config } from "../../../types.js";

export type RetentionDaysTypes = keyof NonNullable<
	Config["softDelete"]["retentionDays"]
>;

/**
 * Gets the retention days for a given data type
 */
const getRetentionDays = (
	softDeleteConfig: Config["softDelete"],
	type: RetentionDaysTypes,
) => {
	const retentionDays = softDeleteConfig.retentionDays?.[type];
	return subDays(
		new Date(),
		retentionDays ?? softDeleteConfig.defaultRetentionDays,
	).toISOString();
};

export default getRetentionDays;
