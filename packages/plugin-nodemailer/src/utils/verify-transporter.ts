import { logger } from "@lucidcms/core";
import type { Transporter } from "nodemailer";
import { PLUGIN_KEY } from "../constants.js";
import T from "../translations/index.js";

const verifyTransporter = async (transporter: Transporter) => {
	try {
		await transporter.verify();
	} catch (error) {
		if (error instanceof Error) {
			logger.warn({
				message: error.message,
				scope: PLUGIN_KEY,
			});
			return;
		}

		logger.warn({
			message: T("email_transporter_not_ready"),
			scope: PLUGIN_KEY,
		});
	}
};

export default verifyTransporter;
