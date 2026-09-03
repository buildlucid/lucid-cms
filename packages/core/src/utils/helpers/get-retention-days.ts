import { subDays } from "date-fns";
import type { Config } from "../../types/config.js";

type RetentionCategory = keyof NonNullable<
	Config["retention"]["purgeAfterDays"]
>;

/** Returns the expiry date for one configured retention category. */
const getRetentionDays = (
	retentionConfig: Config["retention"],
	type: RetentionCategory,
) => {
	const purgeAfterDays = retentionConfig.purgeAfterDays?.[type];
	return subDays(
		new Date(),
		purgeAfterDays ?? retentionConfig.defaultPurgeAfterDays,
	).toISOString();
};

export default getRetentionDays;
