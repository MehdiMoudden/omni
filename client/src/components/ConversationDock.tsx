import { ConversationEntry } from "../hooks/useAssistant";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";

type ConversationDockProps = {
  conversation: ConversationEntry[];
  onReplay: (prompt: string) => void;
  onClear: () => void;
};

export function ConversationDock({ conversation, onReplay, onClear }: ConversationDockProps) {
  return (
    <footer className="border-t border-slate-200/70 bg-white/60 backdrop-blur-xl px-10 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Conversation timeline
          </h4>
          {conversation.length === 0 && (
            <p className="text-xs text-slate-400">
              Dialogue with the assistant will appear here for quick replay and comparison.
            </p>
          )}
        </div>
        {conversation.length > 0 && (
          <button className="text-xs text-slate-500 hover:text-slate-900" onClick={onClear}>
            Clear history
          </button>
        )}
      </div>

      {conversation.length > 0 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {conversation.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onReplay(entry.query)}
              className={clsx(
                "min-w-[220px] bg-white shadow border border-slate-200 rounded-2xl px-4 py-3 text-left space-y-2",
                "hover:border-primary/60 transition"
              )}
            >
              <p className="text-xs text-slate-400">
                {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
              </p>
              <p className="text-sm font-semibold leading-tight line-clamp-2">{entry.query}</p>
              {entry.summary && (
                <p className="text-xs text-slate-500 line-clamp-2">{entry.summary}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </footer>
  );
}
