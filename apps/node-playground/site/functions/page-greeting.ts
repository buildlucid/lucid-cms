import { defineSiteFunction } from "@lucidcms/plugin-site";

const pageGreeting = defineSiteFunction(
	async ({ functions, path, preview }, name: string) => {
		const pages = await functions.documentList("page", { perPage: -1 });
		const mode = preview ? "previewing" : "viewing";
		return `Hello ${name}, you're ${mode} ${path}, one of ${pages.pagination.total} pages.`;
	},
);

export default pageGreeting;
