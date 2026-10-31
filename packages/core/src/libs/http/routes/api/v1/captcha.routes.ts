import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getSettings from "../../../controllers/captcha/get-settings.js";

const captchaRoutes = new Hono<LucidHonoGeneric>().get("/", ...getSettings);

export default captchaRoutes;
