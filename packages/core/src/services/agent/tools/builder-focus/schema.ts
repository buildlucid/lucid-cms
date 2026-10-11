import z from "zod";
import { agentBuilderTargetSchema } from "../../../../schemas/agent-screen.js";

export const inputSchema = agentBuilderTargetSchema;
export const outputSchema = z.object({ shown: z.boolean() });
