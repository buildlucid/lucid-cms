import { defineRoutes } from "@lucidcms/plugin-site";

const routes = defineRoutes({
	"[...slug]": { paths: ({ documentPaths }) => documentPaths("page") },
});

export default routes;
