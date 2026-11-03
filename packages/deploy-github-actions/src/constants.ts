import packageJson from "../package.json" with { type: "json" };

export default {
	apiUrl: "https://api.github.com",
	apiVersion: "2022-11-28",
	userAgent: `LucidCMS-DeployGitHubActions/${packageJson.version}`,
	requestTimeoutMs: 15_000,
} as const;
