import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import cancelRun from "../../../controllers/agent/cancel-run.js";
import compactConversation from "../../../controllers/agent/compact-conversation.js";
import createConversation from "../../../controllers/agent/create-conversation.js";
import createRoutine from "../../../controllers/agent/create-routine.js";
import deleteConversation from "../../../controllers/agent/delete-conversation.js";
import deleteReference from "../../../controllers/agent/delete-reference.js";
import deleteRoutine from "../../../controllers/agent/delete-routine.js";
import generateConversationTitle from "../../../controllers/agent/generate-conversation-title.js";
import getConversation from "../../../controllers/agent/get-conversation.js";
import getConversationDetails from "../../../controllers/agent/get-conversation-details.js";
import getConversations from "../../../controllers/agent/get-conversations.js";
import getDefinitions from "../../../controllers/agent/get-definitions.js";
import getMessages from "../../../controllers/agent/get-messages.js";
import getModels from "../../../controllers/agent/get-models.js";
import getReferences from "../../../controllers/agent/get-references.js";
import getRoutine from "../../../controllers/agent/get-routine.js";
import getRoutineRuns from "../../../controllers/agent/get-routine-runs.js";
import getRoutines from "../../../controllers/agent/get-routines.js";
import respondRun from "../../../controllers/agent/respond-run.js";
import retryConversation from "../../../controllers/agent/retry-conversation.js";
import runRoutine from "../../../controllers/agent/run-routine.js";
import sendMessage from "../../../controllers/agent/send-message.js";
import updateConversation from "../../../controllers/agent/update-conversation.js";
import updateInput from "../../../controllers/agent/update-input.js";
import updateRoutine from "../../../controllers/agent/update-routine.js";
import watchRun from "../../../controllers/agent/watch-run.js";

const agentRoutes = new Hono<LucidHonoGeneric>()
	.get("/definitions", ...getDefinitions)
	.get("/models/:agentKey", ...getModels)
	.get("/conversations", ...getConversations)
	.post("/conversations", ...createConversation)
	.get("/conversations/:id", ...getConversation)
	.patch("/conversations/:id", ...updateConversation)
	.post("/conversations/:id/title/generate", ...generateConversationTitle)
	.delete("/conversations/:id", ...deleteConversation)
	.get("/conversations/:id/details", ...getConversationDetails)
	.get("/conversations/:id/references", ...getReferences)
	.delete("/conversations/:id/references/:referenceId", ...deleteReference)
	.get("/conversations/:id/messages", ...getMessages)
	.post("/conversations/:id/messages", ...sendMessage)
	.patch("/conversations/:id/inputs", ...updateInput)
	.post("/conversations/:id/compact", ...compactConversation)
	.post("/conversations/:id/retry", ...retryConversation)
	.post("/runs/:id/respond", ...respondRun)
	.post("/runs/:id/cancel", ...cancelRun)
	.get("/runs/:id/events", ...watchRun)
	.get("/routines", ...getRoutines)
	.post("/routines", ...createRoutine)
	.get("/routines/:id", ...getRoutine)
	.patch("/routines/:id", ...updateRoutine)
	.delete("/routines/:id", ...deleteRoutine)
	.post("/routines/:id/run", ...runRoutine)
	.get("/routines/:id/runs", ...getRoutineRuns);

export default agentRoutes;
