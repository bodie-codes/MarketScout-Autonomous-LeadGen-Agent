'use client';
import { useState } from 'react';
import type { AgentEvent, AgentStats, Lead } from '@/lib/types';

type Step = { id: string; label: string; detail?: string; status: 'working' | 'done' | 'failed' };

export default function Home() {
  const [offer, setOffer] = useState('I build modern websites and AI chatbots for small businesses.');
  const [target, setTarget] = useState('Independent coffee shops in Ottawa, Canada');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reacts to one live message from the agent
  const handleEvent = (event: AgentEvent) => {
    if (event.type === 'status') {
      setStatus(event.message);
    } else if (event.type === 'tool') {
      setSteps((prev) => {
        const step: Step = { id: event.id, label: event.label, detail: event.detail, status: event.status };
        return prev.some((s) => s.id === event.id)
          ? prev.map((s) => (s.id === event.id ? step : s))
          : [...prev, step];
      });
    } else if (event.type === 'result') {
      setLeads(event.leads);
      setStats(event.stats);
      setStatus(null);
    } else if (event.type === 'error') {
      setError(event.error);
      setStatus(null);
    }
  };

  const runAgent = async () => {
    setRunning(true);
    setStatus('Starting the agent…');
    setSteps([]);
    setLeads([]);
    setStats(null);
    setError(null);

    try {
      const res = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer, target }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Something went wrong. Please try again.');
        return;
      }

      // Read the live steps, one JSON message per line
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.trim()) handleEvent(JSON.parse(line) as AgentEvent);
        }
      }
    } catch {
      setError('Could not reach the server. Please check your connection.');
    } finally {
      setRunning(false);
      setStatus(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-10">
        <header>
          <p className="text-xs font-semibold tracking-[0.3em] text-emerald-400">MARKETSCOUT</p>
          <h1 className="mt-3 text-4xl font-bold">Find your next clients with AI.</h1>
          <p className="mt-2 text-slate-400">
            Describe what you offer and who you're looking for. The agent searches the web,
            reads company websites, scores every lead and drafts a personal email.
          </p>
        </header>

        {/* Input */}
        <section className="space-y-4">
          <label className="block">
            <span className="text-sm text-slate-400">What do you offer?</span>
            <textarea
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              maxLength={300}
              rows={2}
              className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 p-3 focus:outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-400">Who are you looking for?</span>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              maxLength={200}
              className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 p-3 focus:outline-none focus:border-emerald-500"
            />
          </label>
          <button
            onClick={runAgent}
            disabled={running}
            className="rounded-xl bg-emerald-500 text-slate-950 font-semibold px-6 py-3 hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
          >
            {running ? 'Agent is working…' : 'Find leads →'}
          </button>
        </section>

        {/* Live agent activity */}
        {(steps.length > 0 || status) && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-sm font-semibold tracking-wide text-slate-400 mb-4">AGENT ACTIVITY</h2>
            <ul className="space-y-3">
              {steps.map((step) => (
                <li key={step.id} className="flex gap-3">
                  <span className="w-5">
                    {step.status === 'working' ? '⏳' : step.status === 'done' ? '✅' : '⚠️'}
                  </span>
                  <div>
                    <p className="text-sm">{step.label}</p>
                    {step.detail && <p className="text-xs text-slate-500 mt-0.5">{step.detail}</p>}
                  </div>
                </li>
              ))}
              {status && (
                <li className="flex gap-3 text-sm text-emerald-400 animate-pulse">
                  <span className="w-5">🧠</span>
                  {status}
                </li>
              )}
            </ul>
          </section>
        )}

        {/* Error */}
        {error && (
          <p className="rounded-xl border border-rose-900 bg-rose-950/50 text-rose-300 p-4 text-sm">{error}</p>
        )}

        {/* Results */}
        {leads.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-bold">{leads.length} leads found</h2>
              {stats && (
                <p className="text-xs text-slate-500">
                  {stats.searches} searches · {stats.pagesRead} websites read · {(stats.durationMs / 1000).toFixed(1)}s
                </p>
              )}
            </div>

            {leads.map((lead) => (
              <article key={lead.website} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{lead.company}</h3>
                    <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-400 hover:underline">
                      {lead.website}
                    </a>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-bold px-3 py-1">
                    {lead.score}/100
                  </span>
                </div>

                <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                  {lead.reasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>

                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
                  <p className="text-xs text-slate-500 mb-1">Subject: {lead.emailSubject}</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{lead.emailBody}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(`Subject: ${lead.emailSubject}\n\n${lead.emailBody}`)}
                    className="mt-3 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    Copy email
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}