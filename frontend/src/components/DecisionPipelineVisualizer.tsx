import React, { useState } from "react";
import type { Language, TraceEntry } from "../types";
import { DECISION_PIPELINE_UI, NODE_DESCRIPTIONS_I18N, LOCALE_MAP } from "../i18n";

interface Props {
  trace: TraceEntry[];
  requestId?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
  language?: Language;
}

export default function DecisionPipelineVisualizer({
  trace,
  requestId,
  onRefresh,
  isLoading = false,
  language = "en",
}: Props) {
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(null);

  const t = DECISION_PIPELINE_UI[language] ?? DECISION_PIPELINE_UI.en;
  const nodeDescs = NODE_DESCRIPTIONS_I18N[language] ?? NODE_DESCRIPTIONS_I18N.en;
  const locale = LOCALE_MAP[language] ?? "en-IN";

  const totalLatency = trace.reduce((acc, t) => acc + (t.latency_ms || 0), 0);
  const successCount = trace.filter((t) => t.status === "ok").length;

  return (
    <div className="bg-[#fcfaf4] border border-[#d6cfbe] rounded-lg p-4 shadow-sm text-[#1b2b34] font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5dfd0] pb-3 mb-4">
        <div>
          <h3 className="font-serif text-lg font-bold tracking-wide flex items-center gap-2 text-[#12212d]">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#2a7391]"></span>
            {t.heading}
          </h3>
          <p className="text-xs text-[#556975]">
            {t.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {requestId && (
            <span className="font-mono text-[11px] bg-[#f0eae0] px-2 py-0.5 rounded border border-[#d8cfbe] text-[#556975]">
              req: {requestId.slice(0, 12)}…
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-1 text-xs font-medium rounded border border-[#2a7391] text-[#2a7391] hover:bg-[#2a7391] hover:text-white transition-colors disabled:opacity-50"
            >
              {isLoading ? t.tracing : t.reloadTrace}
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Summary KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-[#e2dacb] rounded p-2.5 text-center">
          <div className="text-[10px] uppercase font-bold text-[#70808b] tracking-wider">{t.nodesExecuted}</div>
          <div className="text-xl font-bold font-serif text-[#12212d] mt-0.5">
            {successCount.toLocaleString(locale)} / {trace.length.toLocaleString(locale)}
          </div>
        </div>
        <div className="bg-white border border-[#e2dacb] rounded p-2.5 text-center">
          <div className="text-[10px] uppercase font-bold text-[#70808b] tracking-wider">{t.totalLatency}</div>
          <div className="text-xl font-bold font-mono text-[#2a7391] mt-0.5">
            {totalLatency.toLocaleString(locale)} ms
          </div>
        </div>
        <div className="bg-white border border-[#e2dacb] rounded p-2.5 text-center">
          <div className="text-[10px] uppercase font-bold text-[#70808b] tracking-wider">{t.pipelineStatus}</div>
          <div className="text-sm font-bold text-[#2e7d32] mt-1.5 flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#2e7d32] animate-pulse"></span>
            {t.verifiedOk}
          </div>
        </div>
      </div>

      {/* DAG Stepper Flow */}
      {trace.length === 0 ? (
        <div className="text-center py-8 text-xs text-[#70808b] bg-white/60 border border-dashed border-[#d6cfbe] rounded">
          {t.noTrace}
        </div>
      ) : (
        <div className="relative border-l-2 border-[#2a7391]/30 ml-4 pl-4 space-y-3.5 my-2">
          {trace.map((entry, idx) => {
            const name = entry.node_name || entry.agent || `node-${idx}`;
            const isSelected = selectedNodeIndex === idx;
            const desc = nodeDescs[name.toLowerCase()] || t.fallbackNodeDesc;

            return (
              <div
                key={idx}
                onClick={() => setSelectedNodeIndex(isSelected ? null : idx)}
                className={`relative cursor-pointer transition-all rounded-md p-3 border ${
                  isSelected
                    ? "bg-white border-[#2a7391] shadow-md ring-1 ring-[#2a7391]"
                    : "bg-white/90 border-[#e5dfd0] hover:bg-white hover:border-[#b0a795]"
                }`}
              >
                {/* Node circle on the vertical spine */}
                <div
                  className={`absolute -left-[25px] top-3.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white ${
                    entry.status === "ok"
                      ? "bg-[#2a7391]"
                      : entry.status === "failed"
                      ? "bg-[#c62828]"
                      : "bg-[#9e9e9e]"
                  }`}
                >
                  {idx + 1}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs uppercase px-2 py-0.5 rounded bg-[#f0f4f7] text-[#12212d] border border-[#d2dfe8]">
                      {name}
                    </span>
                    <span className="text-xs font-serif font-semibold text-[#3e515d]">
                      {desc}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[#2a7391] bg-[#eef7fb] px-2 py-0.5 rounded">
                      {entry.latency_ms} ms
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        entry.status === "ok"
                          ? "bg-green-100 text-green-800"
                          : entry.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {entry.status}
                    </span>
                  </div>
                </div>

                {/* Node summary */}
                <div className="text-xs text-[#556975] mt-1.5 pl-0.5">
                  {entry.summary || "Completed node state evaluation and propagated delta updates to graph reducer."}
                </div>

                {/* Expanded state details */}
                {isSelected && (
                  <div className="mt-2.5 pt-2.5 border-t border-[#f0eae0] text-xs space-y-1">
                    <div className="font-semibold text-[#12212d]">{t.telemetryHeading}</div>
                    <div className="font-mono text-[11px] text-[#425460] bg-[#f7f5ed] p-2 rounded border border-[#e5dfd0]">
                      <div>{t.telemetryNode.replace("{name}", name)}</div>
                      <div>{t.telemetryStatus.replace("{status}", entry.status)}</div>
                      <div>{t.telemetryLatency.replace("{latency}", String(entry.latency_ms))}</div>
                      <div>{t.telemetryReducer}</div>
                      {entry.timestamp && (
                        <div>
                          {t.telemetryTime.replace(
                            "{time}",
                            new Date(entry.timestamp).toLocaleTimeString(locale, {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
