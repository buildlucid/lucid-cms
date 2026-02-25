import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getMultipleLogins from "../../../controllers/user-logins/get-multiple.js";
import deleteMultiplePermanently from "../../../controllers/users/delete-multiple-permanently.js";
import deleteSingle from "../../../controllers/users/delete-single.js";
import deleteSinglePermanently from "../../../controllers/users/delete-single-permanently.js";
import getMultiple from "../../../controllers/users/get-multiple.js";
import getSingle from "../../../controllers/users/get-single.js";
import inviteSingle from "../../../controllers/users/invite-single.js";
import resendInvitation from "../../../controllers/users/resend-invitation.js";
import restoreMultiple from "../../../controllers/users/restore-multiple.js";
import unlinkAuthProvider from "../../../controllers/users/unlink-auth-provider.js";
import updateSingle from "../../../controllers/users/update-single.js";

const usersRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/:id", ...getSingle)
	.get("/logins/:id", ...getMultipleLogins)
	.post("/:id/resend-invitation", ...resendInvitation)
	.post("/", ...inviteSingle)
	.post("/restore", ...restoreMultiple)
	.delete("/:id/auth-providers/:providerId", ...unlinkAuthProvider)
	.delete("/permanent", ...deleteMultiplePermanently)
	.delete("/:id/permanent", ...deleteSinglePermanently)
	.delete("/:id", ...deleteSingle)
	.patch("/:id", ...updateSingle);

export default usersRoutes;
