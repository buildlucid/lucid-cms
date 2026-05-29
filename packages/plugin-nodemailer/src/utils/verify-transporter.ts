import { logger } from "@lucidcms/core";
import type { Transporter } from "nodemailer";
import { PLUGIN_KEY } from "../constants.js";

const verifyTransporter = async (transporter: Transporter) => {
	try {
		await transporter.verify();
	} catch (error) {
		if (error instanceof Error) {
			logger.warn({
				message: "Nodemailer transporter is not ready",
				scope: PLUGIN_KEY,
				data: {
					errorMessage: error.message,
				},
			});
			return;
		}

		logger.warn({
			message: "Nodemailer transporter is not ready",
			scope: PLUGIN_KEY,
		});
	}
};

export default verifyTransporter;
