import type { ContentBlock } from "@modelcontextprotocol/server";
import type { z } from "zod";
import type { ResolvedLucidConfig } from "../../types/config.js";
import type { LucidExternalAuth } from "../../types/hono.js";
import type {
	AgentResource,
	AgentScreen,
	AiAccessFeature,
	MediaGenerationType,
} from "../../types/response.js";
import type { JsonValue } from "../../utils/helpers/is-json-object.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import type { RunMode } from "../agent/types.js";
import type { AdminCopyInput, ResolvedAdminCopy } from "../i18n/types.js";
import type { ExternalScope } from "../permission/external-scopes.js";
import type { ToolkitActor } from "../permission/toolkit-actor.js";
import type { Permission } from "../permission/types.js";
import type { Toolkit } from "../toolkit/types.js";
import type { toolDefinitionInternal } from "./tool-definition-internal.js";

export type McpToolAuthority = Pick<LucidExternalAuth, "principal" | "scopes">;

/** Who an agent run acts for, with their current permissions. Routines defined in code act as the system. */
export type AgentToolAuthority = {
	principal: { type: "user"; userId: number } | { type: "system" };
	permissions: readonly Permission[];
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
	/** Agent run making the call, with its principal available through `authority.principal`. */
	run: {
		id: string;
		conversationId: string;
		agentKey: string;
	};
	/** The admin screen that originated the person's latest message. */
	screen?: AgentScreen;
};

/**
 * Internal execution carrying a saved interaction answer.
 * @remarks Interactive handlers receive parsed `data` and `response`.
 */
export type AgentToolInvocation = AgentToolExecution & {
	answer?: {
		data: Record<string, unknown>;
		response: Record<string, unknown>;
	};
};

/** MCP behaviour hints accompanying the tool's `title`. */
export type McpToolAnnotations = {
	/** The tool does not change anything. */
	readOnlyHint?: boolean;
	/** Indicates destructive writes that may remove or overwrite data. */
	destructiveHint?: boolean;
	/** Indicates writes whose repeated calls with identical input have no further effect. */
	idempotentHint?: boolean;
	/** The tool reaches beyond Lucid, eg. the public web. */
	openWorldHint?: boolean;
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

/** Capabilities combined across an agent's tools to describe supported attachments, media and web operations. */
export type AgentToolCapabilities = {
	media?: {
		/** Analyses attached media of these MIME types, eg. "application/pdf" or "image/*". */
		analyze?: { mimeTypes: readonly string[] };
		/** Reads attached text files of these MIME types. */
		readFile?: { mimeTypes: readonly string[] };
		/** Generates or edits these media types with Lucid AI. */
		generate?: Partial<Record<MediaGenerationType, boolean>>;
	};
	web?: {
		/** Searches the public web. */
		search?: boolean;
		/** Reads public webpages. */
		read?: boolean;
	};
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
	/** The run's mode. Tool lists outside a run, such as the agent catalogue, leave it out. */
	mode?: RunMode;
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
			/** Checked for each call against its validated input, eg. read access to the requested collection. */
			inputScopes: (props: { input: Input }) => readonly ExternalScope[];
			/**
			 * Declares every scope `inputScopes` can return so clients can request them.
			 * @remarks Required with `inputScopes`.
			 */
			possibleScopes: (props: {
				config: ResolvedLucidConfig;
			}) => readonly ExternalScope[];
	  }
	| { inputScopes?: never; possibleScopes?: never };

export type DefineMcpToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
> = ToolOptions<Name, Input, Output> &
	ToolScopeOptions<z.output<Input>> & {
		scopes: readonly ExternalScope[];
		annotations?: McpToolAnnotations;
		handler: McpToolHandler<z.output<Input>, z.output<Output>>;
	};

/** `parallelSafe` only applies to tools that only read. */
type AgentToolReadOptions =
	| {
			/**
			 * Marks the handler as read-only, defaulting to false.
			 * @remarks Writes are checkpointed before execution for recovery.
			 */
			readOnly: true;
			/** Allows independent reads to run concurrently, defaulting to false even for paid or state-dependent reads. */
			parallelSafe?: boolean;
	  }
	| { readOnly?: false; parallelSafe?: never };

/** Options shared by ordinary and interactive agent tools. */
type AgentToolBaseOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
> = ToolOptions<Name, Input, Output, AgentToolDescription> &
	AgentToolReadOptions & {
		/** Permissions required to offer the tool, with `[]` allowing every user with agent access. */
		permissions: readonly Permission[];
		/** Checked for each call against its validated input, eg. read access to the requested collection. */
		inputPermissions?: (props: {
			input: z.output<Input>;
		}) => readonly Permission[];
		/**
		 * Confirmation policy in tool-defaults mode, as a boolean or validated-input callback, defaulting to false.
		 * @remarks Routines can override it; callbacks can distinguish direct writes from reviewed requests.
		 */
		requiresConfirmation?:
			| boolean
			| ((props: {
					input: z.output<Input>;
					config: ResolvedLucidConfig;
			  }) => boolean);
		/** What this tool lets the agent do, shown to people in the chat. */
		capabilities?: AgentToolCapabilities;
		/** Controls whether the tool is offered, defaulting to always available. */
		available?: (props: AgentToolAvailabilityProps) => boolean;
		/** Describes a call before execution or confirmation, defaulting to the title. */
		describe?: (props: { input: z.output<Input> }) => AdminCopyInput;
		/**
		 * Output version saved with each call so the admin can render older results.
		 * @remarks Increment when the output shape changes.
		 */
		outputVersion?: number;
	};

export type DefineAgentToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
> = AgentToolBaseOptions<Name, Input, Output> & {
	handler: AgentToolHandler<z.output<Input>, z.output<Output>>;
};

/** Requests a structured response before the tool proceeds. */
export type AgentToolInteraction<Data> = {
	interaction: {
		/** Interaction prompt shown in widgets and input-needed notifications, translated for each viewer. */
		title: AdminCopyInput;
		placement: "inline" | "composer";
		data: Data;
	};
};

/** A checked interaction with its title normalised into admin copy. */
export type ResolvedAgentToolInteraction<Data> = {
	interaction: Omit<AgentToolInteraction<Data>["interaction"], "title"> & {
		title: ResolvedAdminCopy;
	};
};

/** Returned by a skippable interaction's preparation to run the tool without asking. */
export type AgentToolProceed = { proceed: true };

/** Supplies no answer when a skippable interaction is skipped. */
type AgentToolAnswer<
	Data extends z.ZodType,
	Response extends z.ZodType,
	Skippable extends boolean,
> =
	| { data: z.output<Data>; response: z.output<Response> }
	| (Skippable extends true ? { data: undefined; response: undefined } : never);

export type DefineInteractiveAgentToolOptions<
	Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
	Data extends z.ZodType<Record<string, unknown>>,
	Response extends z.ZodType<Record<string, unknown>>,
	Skippable extends boolean = false,
> = AgentToolBaseOptions<Name, Input, Output> & {
	interaction: {
		/** Matches an `agent.widget` admin slot. Keys starting with `lucid-` are reserved. */
		key: string;
		/** Bump when the data or response shape changes, so saved interactions stop matching. */
		version: number;
		/** Object or union schema for saved widget data. */
		data: Data;
		/** Derive allowed responses from the saved data, rather than trusting the browser. */
		response: (props: { data: z.output<Data> }) => Response;
		/**
		 * Allows `prepare` to return `{ proceed: true }` and skips interaction when nobody can answer.
		 * @remarks Skipped calls pass undefined data and response to the handler.
		 */
		skippable?: Skippable;
		/** Read-only and safe to retry. Return an interaction to ask the person, or a result to finish without asking. */
		prepare: ToolHandler<
			z.output<Input>,
			| AgentToolInteraction<z.input<Data>>
			| AgentToolResult<z.output<Output>>
			| (Skippable extends true ? AgentToolProceed : never),
			AgentToolExecution
		>;
	};
	/** Handles an answer or a skipped interaction, and may ask again before writing anything. */
	handler: (
		args: Parameters<AgentToolHandler<z.output<Input>, z.output<Output>>>[0] &
			AgentToolAnswer<Data, Response, Skippable>,
	) => ServiceResponse<
		AgentToolResult<z.output<Output>> | AgentToolInteraction<z.input<Data>>
	>;
};

export type AgentToolPreparation =
	| ResolvedAgentToolResult<Record<string, JsonValue>>
	| ResolvedAgentToolInteraction<Record<string, JsonValue>>
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
	readonly kind: "mcp";
	/** Sent to MCP clients only when set; they fall back to the name. */
	readonly title?: ResolvedAdminCopy;
	readonly scopes: readonly ExternalScope[];
	readonly annotations?: McpToolAnnotations;
	readonly possibleScopes?: (props: {
		config: ResolvedLucidConfig;
	}) => readonly ExternalScope[];
};
export type AgentToolDefinition<Name extends string = string> = Definition<
	Name,
	AgentToolInvocation,
	AgentToolPreparation,
	Permission,
	AgentToolDescription
> & {
	readonly kind: "agent";
	readonly title: ResolvedAdminCopy;
	readonly permissions: readonly Permission[];
	readonly readOnly: boolean;
	readonly parallelSafe: boolean;
	/** Default confirmation flag in tool-defaults mode, with callback policies reported as true. */
	readonly requiresConfirmation: boolean;
	readonly capabilities?: AgentToolCapabilities;
	readonly available?: (props: AgentToolAvailabilityProps) => boolean;
	/** Describes a call before it runs. Invalid input, or a tool without `describe`, uses the title. */
	readonly describe: (input: Record<string, unknown>) => ResolvedAdminCopy;
	readonly outputVersion?: number;
	readonly interaction?: {
		readonly key: string;
		readonly version: number;
		/** Runs may proceed without an answer, and runs without a person to answer skip it. */
		readonly skippable: boolean;
	};
	readonly [toolDefinitionInternal]: {
		/** Evaluates confirmation in tool-defaults mode, requiring confirmation for invalid input when the policy is a callback. */
		readonly requiresConfirmation: (props: {
			input: Record<string, unknown>;
			config: ResolvedLucidConfig;
		}) => boolean;
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
