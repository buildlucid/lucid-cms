import type { Transporter } from "nodemailer";

export interface PluginOptions {
	from: {
		email: string;
		name: string;
	};
	/** Your Nodemailer transporter instance */
	transporter: Transporter;
	/** When set to true, the plugin will not send emails but will still return as a success */
	simulate?: boolean;
}
