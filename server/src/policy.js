import { analyseQueryContext, computeComplexityScore } from "./utils/context.js";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import dotenv from "dotenv";

dotenv.config();

const {
  BEDROCK_REGION,
  BEDROCK_POLICY_MODEL_ID,
} = process.env;

const POLICY_OPTIONS = [
  "elastic_only",
  "elastic_plus_bedrock",
  "elastic_plus_titan_express",
  "elastic_plus_titan_premier",
  "reject_out_of_domain",
];

const policyClient =
  BEDROCK_REGION && BEDROCK_POLICY_MODEL_ID
    ? new BedrockRuntimeClient({ region: BEDROCK_REGION })
    : null;

const CULINARY_QUALIFIERS = [
  "halal",
  "kosher",
  "vegan",
  "vegetarian",
  "gluten",
  "dairy-free",
  "bio",
  "organic",
  "low",
  "less",
  "healthy",
  "kids",
  "allergen",
  "cacao",
  "sugar",
  "protein",
];

/**
 * Placeholder for a future Bedrock policy call.
 * @param {object} payload
 * @returns {Promise<null|{ action: string; confidence?: number; notes?: string }>}
 */
async function callPolicyModel(payload) {
  if (!policyClient) return null;

  const {
    rawQuery,
    expandedQuery,
    translations,
    preferences,
    userBedrockToggle,
    hasBedrockTarget,
    hasTitanExpressTarget,
    hasTitanPremierTarget,
    context,
    dietaryTagCount,
    complexityScore,
  } = payload;
  const systemPrompt = `You are the routing agent for Healthy Basket, a grocery assistant. You decide which engine should be used.
Actions:
- elastic_only: rely on Elastic search heuristics only.
- elastic_plus_bedrock: use Elastic then Claude Sonnet for premium reasoning.
- elastic_plus_titan_express: use Elastic then Amazon Titan Text Express (fast AWS-native reasoning).
- elastic_plus_titan_premier: use Elastic then Amazon Titan Text Premier (higher creativity and depth).
- reject_out_of_domain: query is outside grocery/retail.

Always respond with compact JSON: {"action":"...", "confidence":0-1, "notes":"..."}
Use the provided metrics (dietary tag count, core token count, budget flag, complexity score) to judge query complexity. Prefer elastic_plus_titan_premier when complexity score is high and Premier is available. Prefer elastic_only when the query is very short (<=2 core tokens) and no dietary modifiers are present.
Pick the single most appropriate action.`;

  const translationLine = translations?.length
    ? translations.join(", ")
    : "none";

  const userPrompt = `
Original query: ${rawQuery}
Expanded query: ${expandedQuery}
Added translations: ${translationLine}
Dietary preferences: ${(preferences?.dietaryTags || []).join(", ") || "none"}
Dietary tag count: ${dietaryTagCount}
Budget specified: ${context?.hasBudgetConstraint ? `<= €${context.maxPrice}` : "not specified"}
User toggled Bedrock: ${Boolean(userBedrockToggle)}
Bedrock model available: ${Boolean(hasBedrockTarget)}
Titan Express available: ${Boolean(hasTitanExpressTarget)}
Titan Premier available: ${Boolean(hasTitanPremierTarget)}
Core query (budget suffix removed): ${context?.coreQuery || "(none)"}
Core tokens: ${(context?.coreTokens || []).join(", ") || "none"}
Core token count: ${context?.coreTokenCount ?? 0}
Has budget constraint: ${Boolean(context?.hasBudgetConstraint)}
Complexity score (higher = more complex): ${complexityScore}
Allowed actions: ${POLICY_OPTIONS.join(", ")}
`.trim();

  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 128,
    temperature: 0,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: userPrompt }],
      },
    ],
  };

  try {
    const command = new InvokeModelCommand({
      modelId: BEDROCK_POLICY_MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(body),
    });
    const response = await policyClient.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.body));
    const text =
      payload?.content?.[0]?.text ??
      payload?.completion ??
      null;
    if (!text) return null;
    const parsed = JSON.parse(text);
    if (!POLICY_OPTIONS.includes(parsed.action)) {
      return null;
    }
    return {
      action: parsed.action,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : undefined,
      reason: typeof parsed.notes === "string" ? parsed.notes : undefined,
      source: "model",
    };
  } catch (error) {
    console.warn("Policy model call failed, falling back to heuristics:", error.message);
    return null;
  }
}

function basicHeuristicPolicy({
  preferences,
  userBedrockToggle,
  hasBedrockTarget,
  hasTitanExpressTarget,
  hasTitanPremierTarget,
  context,
}) {
  const tokens = context.tokens;
  const baseTokens = context.coreTokens && context.coreTokens.length ? context.coreTokens : tokens;
  const baseTokenCount = baseTokens.length;
  const originalLength = tokens.length;
  const lowerQuery = context.coreQuery || "";
  const dietaryTagCount = Array.isArray(preferences?.dietaryTags) ? preferences.dietaryTags.length : 0;
  const complexityScore =
    (context.complexityScore ?? 0) ||
    baseTokenCount + dietaryTagCount * 2 + (context.hasBudgetConstraint ? 1 : 0);

  const hasDietaryFilters = Array.isArray(preferences?.dietaryTags) && preferences.dietaryTags.length > 0;
  const hasProjectedComplexity =
    tokens.some((token) => CULINARY_QUALIFIERS.includes(token)) ||
    context.hasBudgetConstraint ||
    /%/.test(lowerQuery) ||
    /\bunder\b|\bover\b|\bmoins\b|\bplus\b/.test(lowerQuery) ||
    baseTokenCount >= 4;

  if (!hasDietaryFilters && !hasProjectedComplexity && baseTokenCount <= 2 && !userBedrockToggle) {
    return {
      action: "elastic_only",
      reason: "Short query without modifiers; Elastic heuristics preferred.",
      confidence: 0.7,
      context,
    };
  }

  if (!hasBedrockTarget && userBedrockToggle && !hasTitanExpressTarget && !hasTitanPremierTarget) {
    return {
      action: "elastic_only",
      reason: "Bedrock unavailable; falling back to Elastic-only.",
      confidence: 0.6,
      context,
    };
  }

  if (hasDietaryFilters || hasProjectedComplexity || userBedrockToggle) {
    if (hasTitanPremierTarget && complexityScore >= 8) {
      return {
        action: "elastic_plus_titan_premier",
        reason: `High complexity score (${complexityScore}) with multiple modifiers; Titan Premier can balance depth and AWS-native guardrails.`,
        confidence: 0.7,
        context,
      };
    }
    if (hasTitanExpressTarget && complexityScore >= 5) {
      return {
        action: "elastic_plus_titan_express",
        reason: `Moderate complexity score (${complexityScore}); Titan Express provides quick AWS-native reasoning.`,
        confidence: 0.65,
        context,
      };
    }
    if (hasBedrockTarget) {
      return {
        action: "elastic_plus_bedrock",
        reason: "Complex query or preferences detected; Bedrock reasoning recommended.",
        confidence: 0.75,
        context,
      };
    }
  }

  return {
    action: "elastic_only",
    reason: "Default to Elastic-only for confident simple search.",
    confidence: 0.6,
    context,
  };
}

export async function decidePolicy({
  rawQuery,
  query,
  translations = [],
  preferences,
  userBedrockToggle,
  hasBedrockTarget,
  hasTitanExpressTarget,
  hasTitanPremierTarget,
}) {
  const analysed = analyseQueryContext(query);
  const complexityScore = computeComplexityScore(analysed, preferences, { userBedrockToggle });
  const dietaryTagCount = Array.isArray(preferences?.dietaryTags) ? preferences.dietaryTags.length : 0;
  const context = {
    ...analysed,
    translations,
    expandedQuery: query,
    rawQuery,
    complexityScore,
  };
  const modelSuggestion = await callPolicyModel({
    rawQuery,
    expandedQuery: query,
    translations,
    preferences,
    userBedrockToggle,
    hasBedrockTarget,
    hasTitanExpressTarget,
    hasTitanPremierTarget,
    context,
    dietaryTagCount,
    complexityScore,
  });

  if (modelSuggestion?.action) {
    return {
      ...modelSuggestion,
      context,
    };
  }

  const heuristicDecision = basicHeuristicPolicy({
    preferences,
    userBedrockToggle,
    hasBedrockTarget,
    hasTitanExpressTarget,
    hasTitanPremierTarget,
    context,
  });
  return { ...heuristicDecision, source: "heuristic" };
}
