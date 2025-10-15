import type { Transporter } from "nodemailer";

export interface PluginOptions {
	/** Your Nodemailer transporter instance */
	transporter: Transporter;
}
