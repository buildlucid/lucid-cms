import { z } from "zod";
import constants from "../../constants/constants.js";
import { agentInteractionRequestSchema } from "../../schemas/agent.js";
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
	AgentToolPreparation,
	AgentToolResult,
	DefineAgentToolOptions,
	DefineInteractiveAgentToolOptions,
	ToolRunResult,
} from "./types.js";

const summaryTextSchema = z.string().trim().min(1).max(2000);

/**
 * Defines a tool for agents. Register it with an agent's `tools`. It runs with
 * the run's authority, and an `interaction` pauses the run for one structured
 * response from the run owner or an agent manager for system runs.
 */
function defineAgentTool<
	const Name extends string,
	Input extends z.ZodObject,
	Output extends z.ZodObject,
	Data extends z.ZodObject,
	Response extends z.ZodObject,
>(
	options: DefineInteractiveAgentToolOptions<
		Name,
		Input,
		Output,
		Data,
		Response
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
	Data extends z.ZodObject,
	Response extends z.ZodObject,
>(
	options:
		| DefineAgentToolOptions<Name, Input, Output>
		| DefineInteractiveAgentToolOptions<Name, Input, Output, Data, Response>,
): AgentToolDefinition<Name> {
	//* the transcript always shows a name, so an untitled tool uses its name with spaces
	const title = normalizeCopy(
		options.title ?? options.name.replaceAll("_", " "),
	);
	const { describe } = options;
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
		requiresApproval: options.requiresApproval ?? false,
		capabilities: options.capabilities,
		outputVersion: options.outputVersion,
	};
	const checkOutput = checkToolResult(options);
	const checkResult = async (
		result: AgentToolResult<unknown>,
		context: ServiceContext,
	) => {
		const summary = adminCopyInputSchema.safeParse(result.summary);
		if (
			summary.success &&
			summaryTextSchema.safeParse(context.translate(summary.data)).success
		) {
			return checkOutput(
				{ ...result, summary: normalizeCopy(summary.data) },
				context,
			);
		}

		//* the summary is display copy, so a bad one never fails a call whose work is done
		logger.error({
			event: "tools.summary.invalid",
			message: `Tool ${options.name} returned an invalid summary`,
		});
		return checkOutput({ ...result, summary: title }, context);
	};

	if (!("interaction" in options)) {
		return {
			...definition,
			[toolDefinitionInternal]: {
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
		interaction: { key: interaction.key, version: interaction.version },
		[toolDefinitionInternal]: {
			prepareInput: (input) =>
				prepareToolInput(
					{
						...options,
						requirements: options.requiredPermissions,
						handler: async (args) => {
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
							checkResult: async (
								result,
								context,
							): Promise<ToolRunResult<AgentToolPreparation>> => {
								if ("output" in result) return checkResult(result, context);

								const { data, ...request } = result.interaction;
								const parsedRequest =
									agentInteractionRequestSchema.safeParse(request);
								const parsedData = await interaction.data.safeParseAsync(data);
								if (
									!parsedRequest.success ||
									!parsedData.success ||
									!isJsonObject(data) ||
									JSON.stringify(data).length >
										constants.agent.limits.interactionDataChars
								) {
									return {
										type: "failed",
										message: context.translate(
											"server:agent.interaction.invalid",
										),
									};
								}

								return {
									type: "success",
									data: { interaction: { ...parsedRequest.data, data } },
								};
							},
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
