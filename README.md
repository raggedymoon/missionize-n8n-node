# n8n-nodes-missionize

N8N community node for [Missionize](https://missionize.ai) AI governance. Intercept AI agent tool calls, enforce policies before execution, and seal every decision into a cryptographic evidence envelope -- all from your N8N workflow canvas.

## Installation

### N8N Community Nodes (recommended)

1. Go to **Settings** > **Community Nodes** in your N8N instance
2. Click **Install a community node**
3. Enter: `n8n-nodes-missionize`
4. Click **Install**

### Manual

```bash
cd ~/.n8n
npm install n8n-nodes-missionize
```

Restart N8N after installation.

## Credentials Setup

1. Go to [app.missionize.ai](https://app.missionize.ai)
2. Navigate to **Workspace Settings** > **API Keys**
3. Click **Generate** to create a new key (starts with `mzkey_`)
4. In N8N: **Credentials** > **New** > search "Missionize API"
5. Paste your API key

## Operations

### Create Session

Start a governance session that groups related agent tool calls.

| Field | Type | Description |
|-------|------|-------------|
| Agent ID | string | Unique identifier for the agent (e.g. `email-agent`) |
| Metadata | JSON | Optional context stored with the session |

**Output:** `session_id`, `agent_id`, `created_at`

### Intercept Tool Call

Intercept an agent tool call for policy evaluation and evidence sealing.

| Field | Type | Description |
|-------|------|-------------|
| Session ID | string | From Create Session output |
| Agent ID | string | Must match Create Session |
| Tool Name | dropdown | `send_email`, `query_database`, `call_api`, `write_file`, `execute_code`, `send_slack_message` |
| Tool Input | JSON | Parameters the agent wants to pass to the tool |
| Return Raw Response | boolean | Include full API response under `_raw` key |

**Output:** `decision` (`proceed` / `block` / `require_approval`), `reason`, `envelope_id`, `session_id`, `policy_set_name`, `mission_id`

### Get Session Timeline

Retrieve the full audit trail for a session.

| Field | Type | Description |
|-------|------|-------------|
| Session ID | string | Session to retrieve |

**Output:** Full session object with all intercept events and envelope IDs.

## Example Workflow

```
Create Session --> Intercept Tool Call --> Switch ({{ $json.decision }})
                                              |
                                    +---------+---------+
                                    |         |         |
                                 ALLOWED   BLOCKED   PENDING
                                    |         |      APPROVAL
                                 (execute  (abort,    (queue
                                  tool)    log it)   for review)
```

1. **Create Session** -- start a governance session for your agent
2. **Intercept Tool Call** -- ask Missionize before executing any tool
3. **Switch** on `{{ $json.decision }}` -- route to ALLOWED, BLOCKED, or PENDING APPROVAL branches
4. Each branch handles the outcome: execute the tool, abort, or queue for human review

Every decision is sealed in a cryptographic evidence envelope that can be verified offline.

## Links

- [Missionize](https://missionize.ai) -- AI governance infrastructure
- [Documentation](https://missionize.ai) -- Product documentation
- [Agent Demo](https://app.missionize.ai/agent-demo) -- Live interactive demo
