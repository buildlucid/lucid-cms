import { expect, test } from "vitest";
import getWorkerSecrets from "./get-worker-secrets.js";

const project = {
	envVariables: [
		{ name: "SECRET", required: true },
		{ name: "SENTRY_DSN", required: false },
		{ name: "PORT", required: false },
	],
	rawEnv: { SECRET: "local", SENTRY_DSN: "https://dsn" },
};

test("declares required variables, and outside deploy builds optional ones with a local value", () => {
	expect(getWorkerSecrets(project, { deploy: true })).toEqual(["SECRET"]);
	expect(getWorkerSecrets(project, { deploy: false })).toEqual([
		"SECRET",
		"SENTRY_DSN",
	]);
});
