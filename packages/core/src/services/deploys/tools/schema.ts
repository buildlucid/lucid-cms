import z from "zod";
import { controllerSchemas } from "../../../schemas/deploys.js";

export const deployKeyInput = z.string().trim().min(1).meta({
	description: "The deploy's key, eg. `production`, from deploys_get.",
});

/** A deploy as tools return it, without its webhook URL. */
export const deploySchema = controllerSchemas.getMultiple.response.element.omit(
	{ webhookUrl: true },
);
