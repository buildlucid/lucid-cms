import { Hono } from "hono";
import inviteSingle from "../../../controllers/users/invite-single.js";
import getSingle from "../../../controllers/users/get-single.js";
import getMultiple from "../../../controllers/users/get-multiple.js";
import deleteSingle from "../../../controllers/users/delete-single.js";
import deleteSinglePermanently from "../../../controllers/users/delete-single-permanently.js";
import restoreMultiple from "../../../controllers/users/restore-multiple.js";
import updateSingle from "../../../controllers/users/update-single.js";
import resendInvitation from "../../../controllers/users/resend-invitation.js";
import getMultipleLogins from "../../../controllers/user-logins/get-multiple.js";
import unlinkAuthProvider from "../../../controllers/users/unlink-auth-provider.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const usersRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/:id", ...getSingle)
	.get("/logins/:id", ...getMultipleLogins)
	.post("/:id/resend-invitation", ...resendInvitation)
	.post("/", ...inviteSingle)
	.post("/restore", ...restoreMultiple)
	.delete("/:id/auth-providers/:providerId", ...unlinkAuthProvider)
	.delete("/:id/permanent", ...deleteSinglePermanently)
	.delete("/:id", ...deleteSingle)
	.patch("/:id", ...updateSingle);

export default usersRoutes;
