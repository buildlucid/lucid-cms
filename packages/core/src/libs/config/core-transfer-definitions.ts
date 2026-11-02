import documentsTransfer from "../../services/documents/transfer/index.js";
import emailsTransfer from "../../services/email/transfer/index.js";
import mediaTransfer from "../../services/media/transfer/index.js";
import usersTransfer from "../../services/users/transfer/index.js";
import type { TransferDefinition } from "../transfer/types.js";

/** Transfer definitions Lucid registers before project and plugin definitions. */
const coreTransferDefinitions: TransferDefinition[] = [
	documentsTransfer,
	mediaTransfer,
	usersTransfer,
	emailsTransfer,
];

export default coreTransferDefinitions;
