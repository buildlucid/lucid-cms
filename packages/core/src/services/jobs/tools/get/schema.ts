import z from "zod";
import { jobDetailsSchema, jobIdInput } from "../schema.js";

export const inputSchema = z.object({ jobId: jobIdInput });

export const outputSchema = z.object({ data: jobDetailsSchema });
