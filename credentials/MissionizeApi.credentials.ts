import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MissionizeApi implements ICredentialType {
	name = 'missionizeApi';
	displayName = 'Missionize API';
	documentationUrl = 'https://missionize.ai';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Missionize API key (starts with mzkey_)',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.missionize.ai',
			description: 'Override for self-hosted deployments',
		},
	];
}
