import { format, createLogger } from "winston";
import transports from "winston/lib/winston/transports/index.js";

const winstonLogger = createLogger({
	level: "info",
	format: format.json(),
});

if (process.env.NODE_ENV !== "production") {
	winstonLogger.add(
		new transports.Console({
			format: format.combine(format.colorize(), format.simple()),
		}),
	);
}

export default winstonLogger;
