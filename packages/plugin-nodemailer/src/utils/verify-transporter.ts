import { logger } from "@lucidcms/core";
import type { Transporter } from "nodemailer";
import { PLUGIN_KEY } from "../constants.js";

const verifyTransporter = async (transporter: Transporter) => {
	try {
		await transporter.verify();
	} catch (error) {
		if (error instanceof Error) {
			logger.warn({
				dedupeKey: `transport.not-ready:${error.message}`,
				error,
				event: "nodemailer.transport.not-ready",
				message: "Nodemailer transporter is not ready",
				owner: PLUGIN_KEY,
				data: {
					errorMessage: error.message,
				},
			});
			return;
		}

		logger.warn({
			dedupeKey: "transport.not-ready",
			message: "Nodemailer transporter is not ready",
			owner: PLUGIN_KEY,
		});
	}
};

export default verifyTransporter;
