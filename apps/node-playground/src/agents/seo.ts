import { defineAgent, defineRoutine } from "@lucidcms/core";

export const seoAgent = defineAgent({
	key: "seo",
	name: "SEO Agent",
	description: "Reviews page metadata and suggests improvements.",
	instructions: `
		Focus on page titles, descriptions and slugs. Suggest concrete changes,
		and explain why each one helps.
	`,
	suggestions: [
		{
			title: "Review page titles",
			description: "Find titles that could be clearer.",
			message:
				"Review page titles and suggest the three most useful improvements. Do not make changes.",
		},
		{
			title: "Spot metadata gaps",
			description: "Find missing descriptions and slugs.",
			message:
				"Find pages with missing or weak SEO metadata. List concrete fixes, but do not make changes.",
		},
	],
	routines: [
		defineRoutine({
			key: "weekly-audit",
			name: "Weekly SEO audit",
			instructions:
				"Review page metadata and report the pages that need better titles or descriptions.",
			schedule: { cron: "0 9 * * 1", timezone: "Europe/London" },
		}),
	],
});
