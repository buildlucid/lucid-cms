import { subDays } from "date-fns";
import type { ResolvedLucidConfig } from "../../types/config.js";

type RetentionCategory = keyof NonNullable<
	ResolvedLucidConfig["retention"]["purgeAfterDays"]
>;

/** Returns the expiry date for one configured retention category. */
const getRetentionDays = (
	retentionConfig: ResolvedLucidConfig["retention"],
	type: RetentionCategory,
) => {
	const purgeAfterDays = retentionConfig.purgeAfterDays?.[type];
	return subDays(
		new Date(),
		purgeAfterDays ?? retentionConfig.defaultPurgeAfterDays,
	).toISOString();
};

export default getRetentionDays;
