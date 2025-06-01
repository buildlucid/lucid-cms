import { Hono } from "hono";
import authRoutes from "./auth.routes.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const routes = new Hono<LucidHonoGeneric>().route("/auth", authRoutes);

export default routes;
