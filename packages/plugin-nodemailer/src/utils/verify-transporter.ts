import { logger } from "@lucidcms/core";
import type { Transporter } from "nodemailer";
import { PLUGIN_KEY } from "../constants.js";

const verifyTransporter = async (
	transporter: Transporter,
	translate: (key: string) => string = (key) => key,
) => {
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
			message: translate("plugin.nodemailer.transporter.not.ready"),
			scope: PLUGIN_KEY,
		});
	}
};

export default verifyTransporter;
