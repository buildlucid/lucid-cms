import { z } from "zod";
import constants from "../../constants/constants.js";
import { agentInteractionRequestSchema } from "../../schemas/agent.js";
import { agentResourceSchema } from "../../schemas/agent-references.js";
import type { ResolvedLucidConfig } from "../../types/config.js";
import { isJsonObject } from "../../utils/helpers/is-json-object.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import { adminCopyInputSchema, copy, normalizeCopy } from "../i18n/index.js";
import logger from "../logger/index.js";
import prepareToolInput, { checkToolResult } from "./prepare-input.js";
import {
	toolDefinitionBase,
	toolDefinitionInternal,
} from "./tool-definition-internal.js";
import type {
	AgentToolDefinition,
	AgentToolInteraction,
	AgentToolPreparation,
	AgentToolProceed,
	AgentToolResult,
	DefineAgentToolOptions,
	DefineInteractiveAgentToolOptions,
	ToolRunResult,
} from "./types.js";

const summaryTextSchema = z.string().trim().min(1).max(2000);
const changesSchema = z.array(agentResourceSchema).optional();

/**
 * Defines an agent tool executed with the run's authority.
 * @remarks Register through an agent's `tools`; interactions pause user runs for a structured response.
 * System runs omit tools with required interactions.
 */
function defineAgentTool<
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
	Data extends z.ZodType<Record<string, unknown>>,
	Response extends z.ZodType<Record<string, unknown>>,
	Optional extends boolean = false,
>(
	options: DefineInteractiveAgentToolOptions<
		Name,
		Input,
		Output,
		Data,
		Response,
		Optional
	>,
): AgentToolDefinition<Name>;
function defineAgentTool<
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
>(
	options: DefineAgentToolOptions<Name, Input, Output>,
): AgentToolDefinition<Name>;
function defineAgentTool<
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
	Data extends z.ZodType<Record<string, unknown>>,
	Response extends z.ZodType<Record<string, unknown>>,
>(
	options:
		| DefineAgentToolOptions<Name, Input, Output>
		| DefineInteractiveAgentToolOptions<
				Name,
				Input,
				Output,
				Data,
				Response,
				boolean
		  >,
): AgentToolDefinition<Name> {
	//* the transcript always shows a name, so an untitled tool uses its name with spaces
	const title = normalizeCopy(
		options.title ?? options.name.replaceAll("_", " "),
	);
	const { describe, requiresConfirmation = false } = options;
	const definition = {
		...toolDefinitionBase(options),
		title,
		describe: (input: Record<string, unknown>) => {
			if (!describe) return title;
			const parsed = options.input.safeParse(input);
			return parsed.success ? normalizeCopy(describe(parsed.data)) : title;
		},
		target: "agent" as const,
		permissions: options.permissions,
		readOnly: options.readOnly ?? false,
		parallelSafe: options.parallelSafe ?? false,
		requiresConfirmation: requiresConfirmation !== false,
		capabilities: options.capabilities,
		available: options.available,
		outputVersion: options.outputVersion,
	};
	const confirms = (props: {
		input: Record<string, unknown>;
		config: ResolvedLucidConfig;
	}) => {
		if (typeof requiresConfirmation === "boolean") return requiresConfirmation;
		const parsed = options.input.safeParse(props.input);
		return (
			!parsed.success ||
			requiresConfirmation({ input: parsed.data, config: props.config })
		);
	};
	const checkOutput = checkToolResult(options);
	const checkInteraction = async (
		result: AgentToolInteraction<unknown>,
		context: ServiceContext,
	): Promise<ToolRunResult<AgentToolPreparation>> => {
		if (!("interaction" in options)) {
			logger.error({
				event: "tools.interaction.invalid",
				message: `Tool ${options.name} asked for input without defining an interaction`,
			});
			return {
				type: "failed",
				message: context.translate("server:core.tools.interaction.invalid"),
			};
		}

		const { data, ...request } = result.interaction;
		const parsedRequest = agentInteractionRequestSchema.safeParse(request);
		const parsedData = await options.interaction.data.safeParseAsync(data);
		//* Screen calls include document content and bypass the widget data size limit.
		const bounded =
			options.interaction.key === constants.agent.widgets.screen ||
			JSON.stringify(data).length <=
				constants.agent.limits.interactionDataChars;
		//* malformed interaction payloads violate the tool contract
		if (
			!parsedRequest.success ||
			!parsedData.success ||
			!isJsonObject(data) ||
			!bounded
		) {
			logger.error({
				event: "tools.interaction.invalid",
				message: `Tool ${options.name} asked for input with an invalid interaction`,
				error:
					parsedRequest.error ??
					parsedData.error ??
					new Error(
						bounded
							? "Interaction data is not lossless JSON"
							: "Interaction data is too large",
					),
			});
			return {
				type: "failed",
				message: context.translate("server:core.tools.interaction.invalid"),
			};
		}

		return {
			type: "success",
			data: { interaction: { ...parsedRequest.data, data } },
		};
	};
	const checkResult = async (
		result:
			| AgentToolResult<unknown>
			| AgentToolInteraction<unknown>
			| AgentToolProceed,
		context: ServiceContext,
	): Promise<ToolRunResult<AgentToolPreparation>> => {
		if ("proceed" in result) {
			return "interaction" in options && options.interaction.optional
				? { type: "success", data: { proceed: true } }
				: {
						type: "failed",
						message: context.translate("server:core.tools.interaction.invalid"),
					};
		}
		if (!("output" in result)) return checkInteraction(result, context);

		//* changes and the summary only shape the admin, so bad ones never fail a call whose work is done
		const changes = changesSchema.safeParse(result.changes);
		if (!changes.success) {
			logger.error({
				event: "tools.changes.invalid",
				message: `Tool ${options.name} returned invalid changes`,
				error: changes.error,
			});
		}
		const checked = {
			...result,
			changes: changes.success ? changes.data : undefined,
		};

		const summary = adminCopyInputSchema.safeParse(result.summary);
		if (
			summary.success &&
			summaryTextSchema.safeParse(context.translate(summary.data)).success
		) {
			return checkOutput(
				{ ...checked, summary: normalizeCopy(summary.data) },
				context,
			);
		}

		logger.error({
			event: "tools.summary.invalid",
			message: `Tool ${options.name} returned an invalid summary`,
		});
		return checkOutput({ ...checked, summary: title }, context);
	};

	if (!("interaction" in options)) {
		return {
			...definition,
			[toolDefinitionInternal]: {
				requiresConfirmation: confirms,
				prepareInput: (input) =>
					prepareToolInput(
						{
							...options,
							requirements: options.requiredPermissions,
							checkResult,
						},
						input,
					),
			},
		};
	}

	const { interaction } = options;

	/** Saved data and responses are parsed with the current schemas, so stale or forged choices are refused. */
	const parseInteraction = async (
		data: unknown,
		response: unknown,
	): ServiceResponse<{
		data: z.output<Data>;
		response: z.output<Response>;
	}> => {
		const parsedData = await interaction.data.safeParseAsync(data);
		if (!parsedData.success) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 409,
					message: copy("server:agent.interaction.unavailable"),
				},
			};
		}

		const parsedResponse = await interaction
			.response(parsedData.data)
			.safeParseAsync(response);
		if (!parsedResponse.success) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 400,
					message: copy("server:agent.interaction.invalid"),
				},
			};
		}

		return {
			error: undefined,
			data: { data: parsedData.data, response: parsedResponse.data },
		};
	};

	return {
		...definition,
		interaction: {
			key: interaction.key,
			version: interaction.version,
			optional: interaction.optional ?? false,
		},
		[toolDefinitionInternal]: {
			requiresConfirmation: confirms,
			prepareInput: (input) =>
				prepareToolInput(
					{
						...options,
						requirements: options.requiredPermissions,
						handler: async (args) => {
							if (!args.execution.interaction && interaction.optional) {
								return options.handler({
									...args,
									data: undefined,
									response: undefined,
								});
							}

							const parsed = await parseInteraction(
								args.execution.interaction?.data,
								args.execution.interaction?.response,
							);
							if (parsed.error) return parsed;

							return options.handler({ ...args, ...parsed.data });
						},
						checkResult,
					},
					input,
				),
			interaction: {
				prepareInput: (input) =>
					prepareToolInput(
						{
							...options,
							requirements: options.requiredPermissions,
							handler: interaction.prepare,
							checkResult,
						},
						input,
					),
				//* the raw response is saved, and the handler parses it again with the schemas current when it runs
				parseResponse: async (data, response) => {
					const parsed = await parseInteraction(data, response);
					if (parsed.error) return parsed;
					if (!isJsonObject(response)) {
						return {
							data: undefined,
							error: {
								type: "basic",
								status: 400,
								message: copy("server:agent.interaction.invalid"),
							},
						};
					}

					return { error: undefined, data: response };
				},
			},
		},
	};
}

export default defineAgentTool;
