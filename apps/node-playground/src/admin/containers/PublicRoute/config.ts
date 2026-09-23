import { defineAdminRoute } from "@lucidcms/core";

const publicRoute = defineAdminRoute({
	key: "public-playground",
	path: "public-playground",
	component: "./src/admin/containers/PublicRoute/PublicRoute.tsx",
	shell: "none",
	access: "public",
});

export default publicRoute;
