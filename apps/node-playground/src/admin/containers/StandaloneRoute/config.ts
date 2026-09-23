import { defineAdminRoute } from "@lucidcms/core";

const standaloneRoute = defineAdminRoute({
	key: "standalone-playground",
	path: "standalone-playground",
	component: "./src/admin/containers/StandaloneRoute/StandaloneRoute.tsx",
	shell: "none",
	navigation: { label: "Standalone playground", group: "content" },
});

export default standaloneRoute;
