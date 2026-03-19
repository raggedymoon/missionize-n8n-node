import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

export class Missionize implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Missionize',
		name: 'missionize',
		icon: 'file:missionize.png',
		group: ['transform'],
		version: 1,
		description: 'Govern AI agent decisions with pre-execution policy enforcement and cryptographic evidence sealing',
		defaults: { name: 'Missionize' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'missionizeApi',
				required: true,
			},
		],
		properties: [
			// Resource (hidden, single resource for v1)
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'hidden',
				default: 'agent',
			},
			// Operation
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create Session',
						value: 'createSession',
						description: 'Start a new governance session for an agent',
						action: 'Create a governance session',
					},
					{
						name: 'Intercept Tool Call',
						value: 'interceptToolCall',
						description: 'Intercept an agent tool call, evaluate policy, and seal evidence',
						action: 'Intercept a tool call',
					},
					{
						name: 'Get Session Timeline',
						value: 'getSessionTimeline',
						description: 'Retrieve all intercept events for a session',
						action: 'Get session timeline',
					},
				],
				default: 'interceptToolCall',
			},

			// --- Create Session fields ---
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				required: true,
				default: '',
				description: 'Unique identifier for this agent (e.g. email-agent, loan-processor)',
				displayOptions: { show: { operation: ['createSession'] } },
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
				description: 'Optional context stored with the session',
				displayOptions: { show: { operation: ['createSession'] } },
			},

			// --- Intercept Tool Call fields ---
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				required: true,
				default: '',
				description: 'Session ID from Create Session output',
				displayOptions: { show: { operation: ['interceptToolCall'] } },
			},
			{
				displayName: 'Agent ID',
				name: 'interceptAgentId',
				type: 'string',
				required: true,
				default: '',
				description: 'Must match the agent ID used in Create Session',
				displayOptions: { show: { operation: ['interceptToolCall'] } },
			},
			{
				displayName: 'Tool Name',
				name: 'toolName',
				type: 'options',
				required: true,
				options: [
					{ name: 'Send Email', value: 'send_email' },
					{ name: 'Query Database', value: 'query_database' },
					{ name: 'Call External API', value: 'call_api' },
					{ name: 'Write File', value: 'write_file' },
					{ name: 'Execute Code', value: 'execute_code' },
					{ name: 'Send Slack Message', value: 'send_slack_message' },
				],
				default: 'send_email',
				description: 'The tool the agent wants to execute',
				displayOptions: { show: { operation: ['interceptToolCall'] } },
			},
			{
				displayName: 'Tool Input',
				name: 'toolInput',
				type: 'json',
				required: true,
				default: '{}',
				description: 'The parameters the agent wants to pass to the tool',
				displayOptions: { show: { operation: ['interceptToolCall'] } },
			},
			{
				displayName: 'Return Raw Response',
				name: 'returnRawResponse',
				type: 'boolean',
				default: false,
				description: 'Whether to include full API response in output alongside normalized fields',
				displayOptions: { show: { operation: ['interceptToolCall'] } },
			},

			// --- Get Session Timeline fields ---
			{
				displayName: 'Session ID',
				name: 'timelineSessionId',
				type: 'string',
				required: true,
				default: '',
				description: 'Session ID to retrieve timeline for',
				displayOptions: { show: { operation: ['getSessionTimeline'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('missionizeApi');

		const baseUrl = ((credentials.baseUrl as string) || 'https://api.missionize.ai').replace(/\/+$/, '');
		const apiKey = credentials.apiKey as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'createSession') {
					const agentId = this.getNodeParameter('agentId', i) as string;
					const metadataStr = this.getNodeParameter('metadata', i, '{}') as string;
					let metadata = {};
					try { metadata = JSON.parse(metadataStr); } catch { metadata = {}; }

					const response = await this.helpers.httpRequest({
						method: 'POST',
						url: `${baseUrl}/api/agent/sessions`,
						headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
						body: { agent_id: agentId, metadata },
						json: true,
					});

					returnData.push({ json: response });

				} else if (operation === 'interceptToolCall') {
					const sessionId = this.getNodeParameter('sessionId', i) as string;
					const agentId = this.getNodeParameter('interceptAgentId', i) as string;
					const toolName = this.getNodeParameter('toolName', i) as string;
					const toolInputStr = this.getNodeParameter('toolInput', i, '{}') as string;
					const returnRaw = this.getNodeParameter('returnRawResponse', i, false) as boolean;
					let toolInput = {};
					try { toolInput = JSON.parse(toolInputStr); } catch { toolInput = {}; }

					const response = await this.helpers.httpRequest({
						method: 'POST',
						url: `${baseUrl}/api/agent/intercept`,
						headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
						body: {
							session_id: sessionId,
							agent_id: agentId,
							tool_name: toolName,
							tool_input: toolInput,
						},
						json: true,
					});

					// Normalized output for downstream Switch node
					const normalized: { [key: string]: string | boolean | number | null | object } = {
						decision: response.decision ?? null,
						reason: response.reason ?? null,
						envelope_id: response.envelope_id ?? null,
						session_id: response.session_id ?? null,
						policy_set_name: response.policy_set_name ?? null,
						mission_id: response.mission_id ?? null,
					};

					if (returnRaw) {
						normalized._raw = response;
					}

					returnData.push({ json: normalized });

				} else if (operation === 'getSessionTimeline') {
					const sessionId = this.getNodeParameter('timelineSessionId', i) as string;

					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: `${baseUrl}/api/agent/sessions/${sessionId}`,
						headers: { 'X-API-Key': apiKey },
						json: true,
					});

					returnData.push({ json: response });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message } });
					continue;
				}
				throw new NodeApiError(this.getNode(), error as any);
			}
		}

		return [returnData];
	}
}
