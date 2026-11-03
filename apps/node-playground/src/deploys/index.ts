import { defineDeploy, deployWebhook } from "@lucidcms/core";

const productionDeploy = defineDeploy({
	key: "production",
	name: "Production",
	description:
		"Rebuilds the public site. Published pages and posts go live in about 20 seconds.",
	links: [
		{ label: "Live site", url: "https://lucidcms.io" },
		{
			label: "Build logs",
			url: "https://github.com/buildlucid/lucid-cms",
		},
	],
	provider: deployWebhook({
		url: new URL("/playground/fake-ci", "http://localhost:6543").toString(),
		callback: true,
	}),
	triggers: [
		{
			service: "documents",
			event: "afterChange",
			when: ({ meta, data }) =>
				["page", "blog"].includes(meta.collectionKey) &&
				(data.change?.type === "published" ||
					data.change?.type === "unpublished") &&
				data.change.version === "production",
		},
	],
	schedule: "0 4 * * *",
});

const stagingDeploy = defineDeploy({
	key: "staging",
	name: "Staging",
	description: "Rebuilds the preview site so the team can check changes first.",
	provider: deployWebhook({
		url: new URL("/playground/fake-ci", "http://localhost:6543").toString(),
		callback: true,
	}),
	triggers: [
		{
			service: "documents",
			event: "afterChange",
			when: ({ meta, data }) =>
				["page", "blog"].includes(meta.collectionKey) &&
				(data.change?.type === "published" ||
					data.change?.type === "unpublished") &&
				data.change.version === "stagig",
		},
	],
	debounceSeconds: 30,
});

export default {
	productionDeploy,
	stagingDeploy,
};
