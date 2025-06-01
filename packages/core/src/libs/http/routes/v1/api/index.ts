import { Hono } from "hono";
import authRoutes from "./auth.routes.js";
import type { LucidHonoContext } from "../../../../../types/hono.js";

const routes = new Hono<LucidHonoContext>().route("/auth", authRoutes);

export default routes;
