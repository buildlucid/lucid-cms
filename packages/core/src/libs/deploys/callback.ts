import crypto from "node:crypto";
import constants from "../../constants/constants.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceContext } from "../../utils/services/types.js";

const signRun = (context: ServiceContext, runId: number) =>
	crypto
		.createHmac("sha256", context.config.secrets.encryption)
		.update("lucid-deploy-callback\0", "utf8")
		.update(String(runId), "utf8")
		.digest("hex");

/** The signed URL a run's CI POSTs its status to. The token only works for that run. */
export const getDeployCallbackUrl = (
	context: ServiceContext,
	runId: number,
) => {
	const url = new URL(
		`${constants.paths.api}/v1/deploys/runs/${runId}/callback`,
		getBaseUrl(context),
	);
	url.searchParams.set("token", signRun(context, runId));
	return url.toString();
};

/** Where a deploy's host sends status updates, for providers with a `webhook` handler. */
export const getDeployWebhookUrl = (
	context: ServiceContext,
	deployKey: string,
) =>
	new URL(
		`${constants.paths.api}/v1/deploys/${deployKey}/webhook`,
		getBaseUrl(context),
	).toString();

/** Compares a callback token with the run's signature in constant time. */
export const deployCallbackTokenMatches = (
	context: ServiceContext,
	runId: number,
	token: string,
) => {
	const expected = Buffer.from(signRun(context, runId), "hex");
	const actual = Buffer.from(token, "hex");

	return (
		actual.length === expected.length &&
		crypto.timingSafeEqual(actual, expected)
	);
};
