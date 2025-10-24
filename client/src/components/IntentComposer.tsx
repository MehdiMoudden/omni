import { FormEvent, useEffect, useState } from "react";
import { IntentPreset } from "../App";
import clsx from "clsx";

type IntentComposerProps = {
  presets: IntentPreset[];
  onSubmit: (nlQuery: string) => void;
  isLoading?: boolean;
  defaultValue?: string;
};

export function IntentComposer({ presets, onSubmit, isLoading, defaultValue = "" }: IntentComposerProps) {
  const [value, setValue] = useState(defaultValue);
  const [servings, setServings] = useState(4);
  const [budget, setBudget] = useState(20);

  useEffect(() => {
    if (!defaultValue) {
      setValue("");
      return;
    }
    const match = defaultValue.match(
      /^(.*?)(?:\s+for\s+\d+\s+people\s+with\s+budget\s+under\s+€\d+)/i
    );
    setValue(match ? match[1].trim() : defaultValue);
  }, [defaultValue]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    onSubmit(
      `${value.trim()} for ${servings} people with budget under €${budget}`
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            Describe your basket
          </span>
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full px-4 py-2 focus-within:border-primary-light focus-within:ring-1 focus-within:ring-primary-light transition">
            <span className="text-slate-400 text-lg">🔍</span>
            <input
              type="text"
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              value={value}
              placeholder="Healthy breakfast for kids under €10"
              onChange={(event) => setValue(event.target.value)}
            />
            <button
              type="submit"
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-primary-light px-4 py-1.5 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading ? "Thinking…" : "Search"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-3">
            <span className="uppercase tracking-wide text-[10px] text-slate-500">
              Household
            </span>
            <input
              type="range"
              min={1}
              max={8}
              value={servings}
              onChange={(event) => setServings(Number(event.target.value))}
              className="w-28 accent-primary-light"
            />
            <span className="text-slate-700 text-sm font-medium">{servings} ppl</span>
          </label>
          <label className="flex items-center gap-3">
            <span className="uppercase tracking-wide text-[10px] text-slate-500">
              Budget (€)
            </span>
            <input
              type="range"
              min={5}
              max={60}
              step={1}
              value={budget}
              onChange={(event) => setBudget(Number(event.target.value))}
              className="w-28 accent-primary-light"
            />
            <span className="text-slate-700 text-sm font-medium">≤ €{budget}</span>
          </label>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {presets.map((preset) => {
            const isActive = value.trim() === preset.prompt.trim();
            return (
              <button
                key={preset.prompt}
                type="button"
                onClick={() => {
                  setValue(preset.prompt);
                  onSubmit(`${preset.prompt} for ${servings} people with budget under €${budget}`);
                }}
                className={clsx(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition",
                  isActive
                    ? "border-primary-light bg-primary-light/20 text-primary-dark"
                    : "border-slate-200 text-slate-600 hover:border-primary-light hover:text-primary-dark"
                )}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-primary-light py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60 sm:hidden"
          disabled={isLoading}
        >
          {isLoading ? "Thinking…" : "Search"}
        </button>
      </form>
    </div>
  );
}
