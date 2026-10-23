import type { HttpExtension } from "../http/types.js";
import { createAdminShellResponse, shouldServeAdminShell } from "./admin.js";

/** Serves the admin's HTML document for admin navigations that no route handled, so client-side routes load the app. */
const createAdminDocumentExtension = (html: string): HttpExtension => ({
	name: "lucid:admin-document",
	phase: "afterSetup",
	register: (app) => {
		app.get("/admin/*", (c, next) => {
			if (!shouldServeAdminShell(c.req.path, c.req.method)) return next();
			return createAdminShellResponse(html, c.req.method);
		});
	},
});

export default createAdminDocumentExtension;
