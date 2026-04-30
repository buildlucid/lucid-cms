import type { Transporter } from "nodemailer";
import type { priorityHeaders } from "../constants.js";

export interface PluginOptions {
	/** Your Nodemailer transporter instance */
	transporter: Transporter;
}

export type EmailPriority = keyof typeof priorityHeaders;

export type EmailWithPriority = {
	priority?: EmailPriority;
	headers?: Record<string, string> | null;
};
