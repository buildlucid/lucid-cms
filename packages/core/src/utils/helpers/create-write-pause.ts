import logger from "../../libs/logger/index.js";

const PAUSE_MINUTES = 10;

/**
 * Pauses an optional write after it fails, such as on deployments with read-only database or
 * storage credentials, so it's tried again every 10 minutes with one warning instead of failing
 * on every request. Create one per write at module level.
 */
const createWritePause = (props: {
	/** What the write does, completing "Couldn't …", such as "store a processed image". */
	action: string;
	scope: string;
}) => {
	let pausedUntil = 0;

	return {
		/** Whether the write is paused after a recent failure. */
		isPaused: () => Date.now() < pausedUntil,
		/** Pauses the write after a failure and logs why. */
		pause: () => {
			pausedUntil = Date.now() + PAUSE_MINUTES * 60_000;
			logger.warn({
				message: `Couldn't ${props.action}, so Lucid will try again in ${PAUSE_MINUTES} minutes. This is expected with read-only database or storage credentials.`,
				scope: props.scope,
			});
		},
	};
};

export default createWritePause;
