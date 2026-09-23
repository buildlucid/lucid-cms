import { defineAdminRoute } from "@lucidcms/core";

const diagnosticsRoute = defineAdminRoute({
	key: "playground",
	path: "playground",
	component: "./src/admin/containers/DiagnosticsRoute/DiagnosticsRoute.tsx",
	navigation: {
		label: "Admin playground",
		group: "content",
		icon: "extensions",
	},
});

export default diagnosticsRoute;
