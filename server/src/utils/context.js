export function analyseQueryContext(query) {
  const lower = (query || "").toLowerCase();
  const tokens = Array.from(
    new Set(lower.split(/\W+/).map((token) => token.trim()).filter(Boolean))
  );
  const coreQuery = lower.replace(/\bfor\s+\d+\s+(?:people|person|ppl)\s+with\s+budget\s+under\b.*$/i, "").trim();
  const coreTokens = Array.from(
    new Set(coreQuery.split(/\W+/).map((token) => token.trim()).filter(Boolean))
  );
  const sauceKeywords = [
    "sauce",
    "salsa",
    "ketchup",
    "passata",
    "puree",
    "purée",
    "paste",
    "condiment",
    "coulis",
    "gazpacho",
  ];
  const wholeKeywords = ["fresh", "whole", "vine", "cluster", "raw"];
  const mentionsSauce = tokens.some((token) => sauceKeywords.includes(token));
  const mentionsFresh = tokens.some((token) => wholeKeywords.includes(token));
  const amountCandidates = [];

  const pushAmount = (value) => {
    if (!value && value !== 0) return;
    const normalised = Number(String(value).replace(",", "."));
    if (Number.isFinite(normalised) && normalised > 0) {
      amountCandidates.push(normalised);
    }
  };

  const euroSymbolRegex = /€\s*(\d+(?:[.,]\d+)?)/g;
  let match;
  while ((match = euroSymbolRegex.exec(lower))) {
    pushAmount(match[1]);
  }

  const trailingEuroRegex = /(\d+(?:[.,]\d+)?)\s*(?:€|eur|euro)s?/g;
  while ((match = trailingEuroRegex.exec(lower))) {
    pushAmount(match[1]);
  }

  const keywordBudgetRegex =
    /(?:under|below|less than|<=|budget(?:\s*(?:under|below|less than))?)\s*(?:€|\s*euros?|eur)?\s*(\d+(?:[.,]\d+)?)/g;
  while ((match = keywordBudgetRegex.exec(lower))) {
    pushAmount(match[1]);
  }

  const isolatedAmountRegex = /(?:^|\s)(\d+(?:[.,]\d+)?)(?=\s*(?:bucks|quid))/g;
  while ((match = isolatedAmountRegex.exec(lower))) {
    pushAmount(match[1]);
  }

  const maxPrice =
    amountCandidates.length > 0 ? Math.min(...amountCandidates) : null;

  return {
    tokens,
    coreQuery,
    coreTokens,
    coreTokenCount: coreTokens.length,
    mentionsSauce,
    mentionsFresh,
    tokenCount: tokens.length,
    hasBudgetConstraint: maxPrice !== null,
    maxPrice,
  };
}

export function computeComplexityScore(context, preferences = {}, options = {}) {
  if (!context) return 0;
  const tokens = Array.isArray(context.coreTokens) ? context.coreTokens : context.tokens || [];
  const coreTokenCount = Array.isArray(context.coreTokens) ? context.coreTokens.length : context.coreTokenCount || tokens.length;
  const dietaryTags = Array.isArray(preferences?.dietaryTags) ? preferences.dietaryTags.length : 0;
  const hasBudget = Boolean(context.hasBudgetConstraint);
  const userBedrockToggle = Boolean(options?.userBedrockToggle);
  return coreTokenCount + dietaryTags * 2 + (hasBudget ? 1 : 0) + (userBedrockToggle ? 2 : 0);
}
const TRANSLATION_RULES = [
  { phrases: ["sweet potato", "sweet potatoes"], translation: "patate douce" },
  { phrases: ["zucchini", "courgette"], translation: "courgette" },
  { phrases: ["eggplant", "aubergine"], translation: "aubergine" },
];

export function expandQueryWithTranslations(query) {
  if (!query || typeof query !== "string") {
    return { expandedQuery: query, translations: [] };
  }
  const lower = query.toLowerCase();
  const additions = new Set();
  for (const rule of TRANSLATION_RULES) {
    if (rule.phrases.some((phrase) => lower.includes(phrase))) {
      additions.add(rule.translation);
    }
  }
  if (!additions.size) {
    return { expandedQuery: query, translations: [] };
  }
  const expandedQuery = `${query} ${Array.from(additions).join(" ")}`.trim();
  return {
    expandedQuery,
    translations: Array.from(additions),
  };
}
