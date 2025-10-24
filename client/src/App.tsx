import { useState } from "react";
import { AssistantView } from "./components/AssistantView";
import { IntentComposer } from "./components/IntentComposer";
import { InsightsPanel } from "./components/InsightsPanel";
import { ConversationDock } from "./components/ConversationDock";
import { useAssistant } from "./hooks/useAssistant";
import { PreferenceToolbar } from "./components/PreferenceToolbar";
import { UserPreferences } from "./lib/types";

export type IntentPreset = {
  label: string;
  prompt: string;
  icon: string;
};

const INTENT_PRESETS: IntentPreset[] = [
  {
    label: "Market salad prep",
    prompt: "Tomates, salade & fromage ideas under €12 for 2 people",
    icon: "🍅",
  },
  {
    label: "Lunchbox boosters",
    prompt: "Jus, yaourt and kid-friendly snacks under €8",
    icon: "🥤",
  },
  {
    label: "Weeknight poulet fuel",
    prompt: "High-protein poulet dinner under €18 for 4 people",
    icon: "🍗",
  },
  {
    label: "Vegan sunrise",
    prompt: "Vegan breakfast staples (lait, pain, compote) under €10",
    icon: "🌱",
  },
  {
    label: "Gluten-free pasta night",
    prompt: "Gluten-free pâtes & sauces under €15 for 3 people",
    icon: "🍝",
  },
  {
    label: "Low-calorie fridge reset",
    prompt: "Low-calorie salades & jus under €11",
    icon: "⚖️",
  },
  {
    label: "Comfort pantry top-up",
    prompt: "Fromage, beurre & pain treats under €14",
    icon: "🧀",
  },
];

export default function App() {
  const [query, setQuery] = useState("Healthy breakfast for kids under €10");
  const [forceSonnet, setForceSonnet] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({ dietaryTags: [] });
  const {
    data,
    isLoading,
    isError,
    trigger,
    conversation,
    mutateConversation,
  } = useAssistant();

  const handleSearch = (nlQuery: string) => {
    setQuery(nlQuery);
    trigger(nlQuery, { useBedrock: forceSonnet, preferences });
  };

  const handlePreferenceChange = (next: UserPreferences) => {
    setPreferences(next);
    trigger(query, { useBedrock: forceSonnet, preferences: next, rerank: true });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <header className="px-10 py-6 border-b border-slate-200/80 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Healthy Basket // Smart Grocery Assistant
          </h1>
          <p className="text-sm text-slate-900/60">
            Powered by Elastic MCP + Amazon Bedrock reasoning.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/20 px-4 py-2 text-sm">
            Health · Savings · Transparency
          </div>
          <button
            onClick={() => {
              const next = !forceSonnet;
              setForceSonnet(next);
              trigger(query, { useBedrock: next, rerank: true, preferences });
            }}
            className={`rounded-full px-4 py-2 text-sm border transition ${
              forceSonnet
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-white text-slate-600 border-slate-200"
            }`}>
            {forceSonnet ? "Force Sonnet: On" : "Force Sonnet: Off"}
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-5 gap-6 px-10 py-8">
        <section className="col-span-2 space-y-6">
          <PreferenceToolbar
            preferences={preferences}
            onChange={handlePreferenceChange}
            disabled={isLoading}
          />
          <IntentComposer
            presets={INTENT_PRESETS}
            onSubmit={handleSearch}
            isLoading={isLoading}
            defaultValue={query}
          />
          <InsightsPanel
            query={query}
            data={data}
            isLoading={isLoading}
            isError={isError}
            onPresetSelect={handleSearch}
            preferences={preferences}
          />
        </section>

        <section className="col-span-3">
          <AssistantView
            query={query}
            data={data}
            isLoading={isLoading}
            isError={isError}
            onRefresh={() => trigger(query, { rerank: true, useBedrock: forceSonnet, preferences })}
          />
        </section>
      </main>

      <ConversationDock
        conversation={conversation}
        onReplay={handleSearch}
        onClear={() => mutateConversation([])}
      />
    </div>
  );
}
