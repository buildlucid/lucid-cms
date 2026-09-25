import { randomUUID } from "node:crypto";
import type { Checkpoint } from "../../../libs/agent/types.js";

/** Starts a model turn with fresh request and message IDs, keeping the transcript. */
const startNextTurn = (checkpoint: Checkpoint) => {
	checkpoint.phase = "model";
	checkpoint.requestId = randomUUID();
	checkpoint.messageId = randomUUID();
	checkpoint.parts = [];
	checkpoint.calls = [];
	checkpoint.cursor = 0;
};

export default startNextTurn;
