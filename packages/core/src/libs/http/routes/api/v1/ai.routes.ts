import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import aiController from "../../../controllers/ai/index.js";

const aiRoutes = new Hono<LucidHonoGeneric>().post(
	"/custom-field-input",
	...aiController.customFieldInput,
);

export default aiRoutes;
