import { translate } from "../../../libs/i18n/index.js";
import type { LucidErrorData } from "../../../types/errors.js";

class TransactionError extends Error {
	error: LucidErrorData;
	constructor(error: LucidErrorData) {
		super(translate(error.message));
		this.error = error;
	}
}

export default TransactionError;
