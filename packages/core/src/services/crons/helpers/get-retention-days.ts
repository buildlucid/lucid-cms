import { subDays } from "date-fns";
import type { Config } from "../../../types.js";

export type RetentionDaysTypes = keyof NonNullable<
	Config["retention"]["purgeAfterDays"]
>;

/**
 * Gets the retention days for a given data type
 */
const getRetentionDays = (
	retentionConfig: Config["retention"],
	type: RetentionDaysTypes,
) => {
	const purgeAfterDays = retentionConfig.purgeAfterDays?.[type];
	return subDays(
		new Date(),
		purgeAfterDays ?? retentionConfig.defaultPurgeAfterDays,
	).toISOString();
};

export default getRetentionDays;
