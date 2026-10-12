import type {
	ContentBlock,
	ToolAnnotations,
} from "@modelcontextprotocol/server";
import type { z } from "zod";
import type { ResolvedLucidConfig } from "../../types/config.js";
import type { LucidExternalAuth } from "../../types/hono.js";
import type {
	AgentResource,
	AgentScreen,
	AiAccessFeature,
} from "../../types/response.js";
import type { JsonValue } from "../../utils/helpers/is-json-object.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import type { RunMode } from "../agent/types.js";
import type { AdminCopyInput, ResolvedAdminCopy } from "../i18n/types.js";
import type { ExternalScope } from "../permission/external-scopes.js";
import type { Permission } from "../permission/types.js";
import type { Toolkit, ToolkitActor } from "../toolkit/types.js";
import { toolDefinitionInternal } from "./tool-definition-internal.js";

export type McpToolAuthority = Pick<LucidExternalAuth, "principal" | "scopes">;

/** Who an agent run acts for, with their current permissions. Routines defined in code act as the system. */
export type AgentToolAuthority = {
	principal: { type: "user"; userId: number } | { type: "system" };
	permissions: readonly string[];
	superAdmin: boolean;
};

export type McpToolExecution = {
	authority: McpToolAuthority;
	signal: AbortSignal;
};
export type AgentToolExecution = {
	authority: AgentToolAuthority;
	/** Pass to toolkit writes, eg. `toolkit.documents.updateSingle`, so they act for the run's principal and are attributed to the run. */
	actor: ToolkitActor;
	signal: AbortSignal;
	/** Stable per tool call. Use for idempotent writes. */
	operationId: string;
	/** The agent run making the call, eg. to attribute usage or read its conversation. */
	run: {
		id: string;
		conversationId: string;
		userId: number | null;
		agentKey: string;
	};
	/** The admin screen that originated the person's latest message. */
	screen?: AgentScreen;
	/** Saved input supplied by the runner after an interaction. */
	interaction?: {
		data: Record<string, unknown>;
		response: Record<string, unknown>;
	};
};

export type McpToolResult<Output> = {
	output: Output;
	/** Replaces the default JSON text block, eg. to return an image. */
	content?: ContentBlock[];
	widgets?: never;
	changes?: never;
};
export type AgentToolResult<Output> = {
	output: Output;
	/** Short, factual admin copy shown in the transcript. Translated text outside 1–2000 characters is logged and replaced by the title. Kept out of the model's output. */
	summary: AdminCopyInput;
	/** Trusted UI data rendered through the agent.widget slot. */
	widgets?: { key: string; version: number; data: Record<string, JsonValue> }[];
	/** Media, documents and requests the call changed, so admin views of them refresh as the agent works. Invalid entries are logged and dropped. */
	changes?: AgentResource[];
	content?: never;
};

/** A checked result with literal strings normalised into admin copy. */
export type ResolvedAgentToolResult<Output> = Omit<
	AgentToolResult<Output>,
	"summary"
> & { summary: ResolvedAdminCopy };

export type ToolHandler<Input, Result, Execution> = (args: {
	context: ServiceContext;
	input: Input;
	execution: Execution;
	/** Trusted server helpers. They do not check the caller's permissions or scopes. */
	toolkit: Toolkit;
}) => ServiceResponse<Result>;

export type AgentToolHandler<Input, Output> = ToolHandler<
	Input,
	AgentToolResult<Output>,
	AgentToolExecution
>;
export type McpToolHandler<Input, Output> = ToolHandler<
	Input,
	McpToolResult<Output>,
	McpToolExecution
>;

/**
 * What a tool lets an agent do, from a person's point of view. Lucid combines
 * these across an agent's tools to show people what it can do, such as which
 * attached files it can open or whether it can search the web.
 */
export type AgentToolCapabilities = {
	/** Analyses attached media of these MIME types, eg. "application/pdf" or "image/*". */
	mediaAnalysis?: { mimeTypes: readonly string[] };
	/** Reads attached text files of these MIME types. */
	fileRead?: { mimeTypes: readonly string[] };
	/** Searches the public web. */
	webSearch?: boolean;
	/** Reads public webpages. */
	webRead?: boolean;
	/** Generates images with Lucid AI. */
	imageGeneration?: boolean;
	/** Generates audio with Lucid AI. */
	audioGeneration?: boolean;
};

export type AgentToolDescriptionProps = {
	mode: RunMode;
	/** The kind of admin screen the person has open, when the agent can use builder tools on it. */
	screen?: AgentScreen["type"];
};

export type AgentToolDescription =
	| string
	| ((props: AgentToolDescriptionProps) => string);

export type AgentToolAvailabilityProps = {
	config: ResolvedLucidConfig;
	/** The Lucid AI features the organisation allows this CMS to use. */
	aiAccess: readonly AiAccessFeature[];
	/** The originating screen type, when the run has a screen. */
	screen?: AgentScreen["type"];
};

type ToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
	Description = string,
> = {
	/** Unique among MCP tools, or within an agent. Prefix plugin tools to avoid collisions. */
	name: Name;
	/** A plain-language name shown to people, eg. "Save note". Agent tools default to the name with spaces. */
	title?: AdminCopyInput;
	/** Model-facing guidance: what the tool does, when to use it and its constraints. */
	description: Description;
	input: Input;
	output: Output;
};

type ToolScopeOptions<Input> =
	| {
			requiredScopes: (input: Input) => readonly ExternalScope[];
			advertisedScopes: (
				config: ResolvedLucidConfig,
			) => readonly ExternalScope[];
	  }
	| { requiredScopes?: never; advertisedScopes?: never };

export type DefineMcpToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
> = ToolOptions<Name, Input, Output> &
	ToolScopeOptions<z.output<Input>> & {
		scopes: readonly ExternalScope[];
		annotations?: ToolAnnotations;
		handler: McpToolHandler<z.output<Input>, z.output<Output>>;
	};

export type DefineAgentToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
> = ToolOptions<Name, Input, Output, AgentToolDescription> & {
	/** Needed for the agent to be offered this tool at all. Pass [] for every user with agent access. */
	permissions: readonly Permission[];
	/** Checked for each call against its validated input, eg. read access to the requested collection. */
	requiredPermissions?: (input: z.output<Input>) => readonly Permission[];
	/** Whether the handler only reads data. Defaults to false. Writes are checkpointed before execution for safe recovery. */
	readOnly?: boolean;
	/** Safe to run alongside other independent reads. Requires readOnly. Defaults to false, including for paid or state-dependent reads. */
	parallelSafe?: boolean;
	/** Ask before executing in tool-defaults mode. Routines can override this. Defaults to false. */
	requiresConfirmation?: boolean;
	/** What this tool lets the agent do, shown to people in the chat. */
	capabilities?: AgentToolCapabilities;
	/** Controls whether the tool is offered, defaulting to always available. */
	available?: (props: AgentToolAvailabilityProps) => boolean;
	/** Describes a call before it runs, eg. while it waits for confirmation. Defaults to the title. */
	describe?: (input: z.output<Input>) => AdminCopyInput;
	/** Saved with each call. Bump it when the output shape changes so the admin can keep rendering older results. */
	outputVersion?: number;
	handler: AgentToolHandler<z.output<Input>, z.output<Output>>;
};

/** Requests a structured response before the tool proceeds. */
export type AgentToolInteraction<Data> = {
	interaction: {
		title: string;
		placement: "inline" | "composer";
		data: Data;
	};
};

/** Returned by an optional interaction's preparation to run the tool without asking. */
export type AgentToolProceed = { proceed: true };

/** Supplies no answer when an optional interaction is skipped. */
type AgentToolAnswer<
	Data extends z.ZodType,
	Response extends z.ZodType,
	Optional extends boolean,
> =
	| { data: z.output<Data>; response: z.output<Response> }
	| (Optional extends true ? { data: undefined; response: undefined } : never);

export type DefineInteractiveAgentToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
	Data extends z.ZodType<Record<string, unknown>>,
	Response extends z.ZodType<Record<string, unknown>>,
	Optional extends boolean = false,
> = Omit<DefineAgentToolOptions<Name, Input, Output>, "handler"> & {
	interaction: {
		/** Matches an `agent.widget` admin slot. Keys starting with `lucid-` are reserved. */
		key: string;
		/** Bump when the data or response shape changes, so saved interactions stop matching. */
		version: number;
		/** Object or union schema for saved widget data. */
		data: Data;
		/** Derive allowed responses from the saved data, rather than trusting the browser. */
		response: (data: z.output<Data>) => Response;
		/** Allows `prepare` to return `{ proceed: true }` and routines to skip asking, passing undefined data and response to the handler. */
		optional?: Optional;
		/** Read-only and safe to retry. Return an interaction to ask the person, or a result to finish without asking. */
		prepare: ToolHandler<
			z.output<Input>,
			| AgentToolInteraction<z.input<Data>>
			| AgentToolResult<z.output<Output>>
			| (Optional extends true ? AgentToolProceed : never),
			AgentToolExecution
		>;
	};
	/** Handles an answer or skipped optional review, and may ask again before writing anything. */
	handler: (
		args: Parameters<AgentToolHandler<z.output<Input>, z.output<Output>>>[0] &
			AgentToolAnswer<Data, Response, Optional>,
	) => ServiceResponse<
		AgentToolResult<z.output<Output>> | AgentToolInteraction<z.input<Data>>
	>;
};

export type AgentToolPreparation =
	| ResolvedAgentToolResult<Record<string, JsonValue>>
	| AgentToolInteraction<Record<string, JsonValue>>
	| AgentToolProceed;

export type ToolRunResult<Result> =
	| { type: "success"; data: Result }
	| { type: "invalid-input"; message: string }
	| { type: "failed"; message: string };

export type ToolPreparationResult<Execution, Result, Requirement> =
	| {
			type: "ready";
			data: {
				requirements: readonly Requirement[];
				run: (args: {
					context: ServiceContext;
					execution: Execution;
				}) => Promise<ToolRunResult<Result>>;
			};
	  }
	| { type: "invalid-input"; message: string };

type Definition<
	Name extends string,
	Execution,
	Result,
	Requirement,
	Description = string,
> = {
	readonly type: "tool-definition";
	readonly name: Name;
	readonly description: Description;
	readonly input: z.ZodObject;
	readonly output: z.ZodObject;
	readonly [toolDefinitionInternal]: {
		readonly prepareInput: (
			input: unknown,
		) => Promise<ToolPreparationResult<Execution, Result, Requirement>>;
	};
};

export type McpToolDefinition<Name extends string = string> = Definition<
	Name,
	McpToolExecution,
	McpToolResult<Record<string, JsonValue>>,
	ExternalScope
> & {
	readonly target: "mcp";
	/** Sent to MCP clients only when set; they fall back to the name. */
	readonly title?: ResolvedAdminCopy;
	readonly scopes: readonly ExternalScope[];
	readonly annotations?: ToolAnnotations;
	readonly advertisedScopes?: (
		config: ResolvedLucidConfig,
	) => readonly ExternalScope[];
};
export type AgentToolDefinition<Name extends string = string> = Definition<
	Name,
	AgentToolExecution,
	AgentToolPreparation,
	Permission,
	AgentToolDescription
> & {
	readonly target: "agent";
	readonly title: ResolvedAdminCopy;
	readonly permissions: readonly Permission[];
	readonly readOnly: boolean;
	readonly parallelSafe: boolean;
	readonly requiresConfirmation: boolean;
	readonly capabilities?: AgentToolCapabilities;
	readonly available?: (props: AgentToolAvailabilityProps) => boolean;
	/** Describes a call before it runs. Invalid input, or a tool without `describe`, uses the title. */
	readonly describe: (input: Record<string, unknown>) => ResolvedAdminCopy;
	readonly outputVersion?: number;
	readonly interaction?: {
		readonly key: string;
		readonly version: number;
		/** Allows execution without an answer, including in routine runs. */
		readonly optional: boolean;
	};
	readonly [toolDefinitionInternal]: {
		readonly interaction?: {
			readonly prepareInput: (
				input: unknown,
			) => Promise<
				ToolPreparationResult<
					AgentToolExecution,
					AgentToolPreparation,
					Permission
				>
			>;
			/** Checks a response against the saved data, returning it ready to save. */
			readonly parseResponse: (
				data: unknown,
				response: unknown,
			) => ServiceResponse<Record<string, JsonValue>>;
		};
	};
};

/** An opaque tool created with `defineMcpTool` for `ai.mcp.tools`, or `defineAgentTool` for an agent's `tools`. */
export type ToolDefinition<Name extends string = string> =
	| AgentToolDefinition<Name>
	| McpToolDefinition<Name>;
