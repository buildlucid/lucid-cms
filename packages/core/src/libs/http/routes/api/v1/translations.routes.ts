import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import createGlossaryTerm from "../../../controllers/translations/create-glossary-term.js";
import deleteGlossaryTerm from "../../../controllers/translations/delete-glossary-term.js";
import getSettings from "../../../controllers/translations/get-settings.js";
import updateGlossaryTerm from "../../../controllers/translations/update-glossary-term.js";
import updateStyle from "../../../controllers/translations/update-style.js";

const translationRoutes = new Hono<LucidHonoGeneric>()
	.get("/settings", ...getSettings)
	.post("/glossary", ...createGlossaryTerm)
	.patch("/glossary/:id", ...updateGlossaryTerm)
	.delete("/glossary/:id", ...deleteGlossaryTerm)
	.put("/styles/:locale", ...updateStyle);

export default translationRoutes;
