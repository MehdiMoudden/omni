# Healthy Basket Assistant

A full-stack prototype for a smart grocery assistant that blends Elastic MCP data with Amazon Bedrock-style reasoning and a premium shopper UX.

## Architecture

```
healthyBasket/
├── server/            # Express proxy that talks to Elastic MCP + optional Bedrock reasoning
│   ├── src/index.js
│   └── .env.example
├── client/            # Vite + React + Tailwind front-end experience
│   ├── src/
│   ├── tailwind.config.cjs
│   └── vite.config.ts (proxy to the server)
├── import_to_elastic.py  # Bulk importer for the sample dataset
├── data/healthy_basket_dataset.json
└── test_mcp_connection.py
```

Key flows:

1. The **client** sends intent requests to `/api/assistant`.
2. The **server** initialises the Elastic MCP endpoint, calls the custom tools `healthy-basket-products` and `healthy-basket-promotions`, flattens the payloads, and aggregates results.
3. Reasoning is delegated to an optional Bedrock-compatible endpoint. When unavailable, the proxy returns a heuristic explanation so the UX still illustrates insights.
4. The UI renders ranked products, promotion callouts, health and savings meters, and a conversational timeline for rapid iteration on shopper goals.

## Getting started

### 1. Install dependencies

```bash
# from healthyBasket/
(cd server && npm install)
(cd client && npm install)
```

### 2. Configure environment variables

1. Copy `server/.env.example` to `server/.env` and fill in your credentials:

```ini
MCP_URL=https://my-elasticsearch-project-.../api/agent_builder/mcp
MCP_API_KEY=your_api_key
PORT=5050
# Optional Bedrock settings (see below)
# BEDROCK_REGION=us-east-1
# BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
# BEDROCK_INFERENCE_PROFILE_ARN=arn:aws:bedrock:us-east-1:975050203092:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0
```

> ⚠️ The proxy will refuse requests until both `MCP_URL` and `MCP_API_KEY` are supplied. The Bedrock values are optional; when omitted the assistant returns heuristic reasoning strings so the UX stays explainable.

### 3. Seed sample data (optional)

If you have not yet indexed the provided dataset, use the importer (requires the Elastic `_bulk` API key):

```bash
python3 import_to_elastic.py --es-url https://my-elasticsearch-project-bcf9d2.es.us-east-1.aws.elastic.cloud \
  --index-name healthy-basket-products \
  --promotions-index healthy-basket-promotions
```

### 4. Run the stack

```bash
# terminal 1
cd server
npm run dev

# terminal 2
cd client
npm run dev
```

The client is proxied to the Express API (`vite.config.ts`), so visiting <http://localhost:5173> loads the full assistant.

## Bedrock integration

The proxy contains `reasonWithBedrock()`, which invokes Amazon Bedrock directly via the AWS SDK when you set `BEDROCK_REGION`. You can target either a foundation model (with `BEDROCK_MODEL_ID`) or an inference profile (supply `BEDROCK_INFERENCE_PROFILE_ARN`; the proxy will automatically derive the profile ID for `modelId`). By default it calls `anthropic.claude-3-5-sonnet-20241022-v2:0` and the provided sample inference profile `arn:aws:bedrock:us-east-1:975050203092:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0`. Ensure your AWS credentials are available through the standard SDK resolution chain (environment variables, profiles, or IAM role). When Bedrock is enabled, the proxy forwards a rich snapshot (brand, description, nutrition, savings) of up to 12 Elastic candidates and expects the model to reply with JSON containing `summary`, `details`, and a `product_ranking` array (referencing either product IDs or exact names); any matched products are re-ordered in the API response so the UI reflects Bedrock's priorities. The response is expected to look like:

```json
{
  "summary": "Recommended because ...",
  "details": ["Primary driver ...", "Savings ...", "Nutrition ..."]
}
```

If the endpoint is absent, the proxy synthesises a deterministic explanation using health scores and promotion counts so the UI still visualises the AI narrative.

A lightweight routing layer sits in front of the stack. If you set `BEDROCK_POLICY_MODEL_ID` (e.g. `anthropic.claude-3-haiku-20240307-v1:0`), the proxy will call that model to decide between `elastic_only`, `elastic_plus_bedrock`, `elastic_plus_titan_express`, `elastic_plus_titan_premier`, or `reject_out_of_domain`. Optional env vars `BEDROCK_TITAN_EXPRESS_MODEL_ID` (default `amazon.titan-text-express-v1`) and `BEDROCK_TITAN_PREMIER_MODEL_ID` (default `amazon.titan-text-premier-v1`) enable AWS-native reasoning tiers. When the policy model is absent, the router falls back to heuristics (which never auto-reject) and you can still inspect the decision in the API response (`meta.policyDecision`) and UI badges. The assistant header highlights which engines were active (Elastic, Policy, Bedrock, Titan Express/Premier).

## UI highlights

- **Intent Composer**: natural-language search with household & budget sliders and curated presets.
- **Insights Panel**: live health/savings telemetry, budget compliance meter, and assistant focus chips.
- **Personalisation Toolbar**: dietary & lifestyle toggles (vegan, halal, gluten-free, etc.) that flow into Elastic filters and Bedrock reasoning.
- **Recommendation Stack**: animated cards showing Nutri-Score, savings, promo badges, and action CTA.
- **Meta Signals**: Bedrock/Elastic status badges and transparency chips in every response.
- **Policy Logging**: every routing decision (Elastic vs. Sonnet vs. Titan) is posted to your `${POLICY_LOG_INDEX:-policy-decisions}` index on Elastic Cloud. Create the index first via Kibana Dev Tools **and, if you prefer, supply a dedicated endpoint/api key via `POLICY_LOG_URL` + `POLICY_LOG_API_KEY`**:

  ```http
  PUT policy-decisions
  {
    "mappings": {
      "properties": {
        "timestamp":       { "type": "date" },
        "query":           { "type": "text" },
        "preferences":     { "type": "keyword" },
        "action":          { "type": "keyword" },
        "resolved_action": { "type": "keyword" },
        "original_action": { "type": "keyword" },
        "confidence":      { "type": "float" },
        "reason":          { "type": "text" },
        "source":          { "type": "keyword" },
        "final_model":     { "type": "keyword" }
      }
    }
  }
  ```

  The server uses the same Elastic API key as MCP (`Authorization: ApiKey …`) and writes straight to `https://<your-project>.elastic.cloud/policy-decisions/_doc`.
- **Titan configuration**: set `BEDROCK_TITAN_EXPRESS_MODEL_ID` to `amazon.titan-text-g1-express`. For the premium tier, create an inference profile (e.g. `arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.amazon.nova-premier-v1:0`) and assign it to `BEDROCK_TITAN_PREMIER_MODEL_ID`.
- **Bilingual queries**: the meta-agent automatically appends a few French synonyms (e.g. `sweet potato → patate douce`) before routing and searching, so English grocery requests find their French counterparts.
- **Promotion Callouts**: dedicated panel for Elastic promotions data.
- **Conversation Dock**: timeline of intents for instant replay and comparison.
- **Policy Logging**: every routing decision (Elastic vs. Bedrock vs. Titan) is written to the `policy-decisions` index via the existing MCP connection—create the index in Elastic Cloud Dev Tools before running.

## Next steps

- Connect a real Bedrock reasoning endpoint to enrich the explanation panel.
- Extend the proxy to cache MCP lookups and merge catalogue nutrition tables for richer comparisons.
- Hook “Add to basket” to your commerce backend or Elastic ingest pipeline.
- Add authentication / user profiles for personalised budgets, allergens, and loyalty clips.

Enjoy exploring the Healthy Basket experience! 💚
