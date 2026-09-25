import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import cancelRun from "../../../controllers/agent/cancel-run.js";
import createConversation from "../../../controllers/agent/create-conversation.js";
import createRoutine from "../../../controllers/agent/create-routine.js";
import deleteConversation from "../../../controllers/agent/delete-conversation.js";
import deleteRoutine from "../../../controllers/agent/delete-routine.js";
import getConversation from "../../../controllers/agent/get-conversation.js";
import getConversations from "../../../controllers/agent/get-conversations.js";
import getMessages from "../../../controllers/agent/get-messages.js";
import getRoutine from "../../../controllers/agent/get-routine.js";
import getRoutineRuns from "../../../controllers/agent/get-routine-runs.js";
import getRoutines from "../../../controllers/agent/get-routines.js";
import respondRun from "../../../controllers/agent/respond-run.js";
import runRoutine from "../../../controllers/agent/run-routine.js";
import sendMessage from "../../../controllers/agent/send-message.js";
import updateConversation from "../../../controllers/agent/update-conversation.js";
import updateRoutine from "../../../controllers/agent/update-routine.js";
import watchRun from "../../../controllers/agent/watch-run.js";

const agentRoutes = new Hono<LucidHonoGeneric>()
	.get("/conversations", ...getConversations)
	.post("/conversations", ...createConversation)
	.get("/conversations/:id", ...getConversation)
	.patch("/conversations/:id", ...updateConversation)
	.delete("/conversations/:id", ...deleteConversation)
	.get("/conversations/:id/messages", ...getMessages)
	.post("/conversations/:id/messages", ...sendMessage)
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
