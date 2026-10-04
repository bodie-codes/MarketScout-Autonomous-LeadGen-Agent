'use client';
import { useEffect, useState, type ReactNode } from 'react';
import type { AgentEvent, AgentStats, Lead } from '@/lib/types';

/* ---------- Types and constants ---------- */

type StepStatus = 'working' | 'done' | 'failed';
type StepKind = 'search' | 'verify' | 'read' | 'write';
type Step = { id: string; kind: StepKind; label: string; detail?: string; status: StepStatus };
type ToolEvent = Extract<AgentEvent, { type: 'tool' }>;

const PRESETS = [
  {
    label: '☕ Coffee shops · Ottawa',
    offer: 'I build modern websites and AI chatbots for small businesses.',
    target: 'Independent coffee shops in Ottawa, Canada',
  },
  {
    label: '🍕 Pizzerias · Calgary',
    offer: 'I help restaurants get more online orders with a custom ordering system.',
    target: 'Family-owned pizza restaurants in Calgary, Canada',
  },
  {
    label: '🦷 Dentists · Toronto',
    offer: 'I run Google Ads and local SEO campaigns that bring new patients to dental clinics.',
    target: 'Independent dental clinics in Toronto, Canada',
  },
];

const PHASES: { kind: StepKind; label: string }[] = [
  { kind: 'search', label: 'Discover' },
  { kind: 'verify', label: 'Verify' },
  { kind: 'read', label: 'Read' },
  { kind: 'write', label: 'Score & write' },
];

const CARD = 'rounded-3xl border border-white/[0.07] bg-white/[0.02]';

function kindOf(event: ToolEvent): StepKind {
  if (event.tool === 'write_leads') return 'write';
  if (event.tool === 'read_websites') return 'read';
  if (event.label.startsWith('Finding website')) return 'verify';
  return 'search';
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/* ---------- Small visual pieces ---------- */

function KindIcon({ kind }: { kind: StepKind }) {
  const shapes: Record<StepKind, ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    verify: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </>
    ),
    read: (
      <>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M9 10h6M9 14h6M9 18h4" />
      </>
    ),
    write: (
      <>
        <path d="m4 20 4-1 11-11-3-3L5 16z" />
        <path d="m14 6 3 3" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {shapes[kind]}
    </svg>
  );
}

function StatusBadge({ status }: { status: StepStatus }) {
  if (status === 'working') {
    return <span className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" aria-label="Working" />;
  }
  if (status === 'failed') {
    return <span className="text-rose-400 text-sm font-bold" aria-label="Failed">✕</span>;
  }
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-label="Done">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#64748b';
  const label = score >= 80 ? 'Strong fit' : score >= 50 ? 'Possible fit' : 'Weak fit';

  return (
    <div className="flex flex-col items-center gap-1 flex-none">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
          <circle cx="28" cy="28" r={radius} fill="none" stroke="#1e293b" strokeWidth="5" />
          <circle
            cx="28" cy="28" r={radius} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{score}</span>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
    </div>
  );
}

/* ---------- One lead card ---------- */

function LeadCard({ lead, rank }: { lead: Lead; rank: number }) {
  const [open, setOpen] = useState(rank === 1);
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    await navigator.clipboard.writeText(`Subject: ${lead.emailSubject}\n\n${lead.emailBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className={`${CARD} p-6 md:p-7 transition-colors hover:border-emerald-400/20`}>
      <div className="flex items-start gap-5">
        <ScoreRing score={lead.score} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500">#{rank}</p>
          <h3 className="text-lg font-semibold text-white">{lead.company}</h3>
          <a
            href={lead.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline break-all"
          >
            {domainOf(lead.website)} ↗
          </a>

          <ul className="mt-4 space-y-2">
            {lead.reasons.map((reason, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300 leading-relaxed">
                <span className="text-emerald-400 mt-0.5">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <button
          onClick={() => setOpen(!open)}
          className="text-sm font-semibold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer"
          aria-expanded={open}
        >
          <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
          {open ? 'Hide draft email' : 'Show draft email'}
        </button>

        {open && (
          <div className="mt-4 rounded-2xl bg-black/40 border border-white/[0.06] p-5">
            <p className="text-xs text-slate-500">
              Subject: <span className="text-slate-300">{lead.emailSubject}</span>
            </p>
            <p className="mt-3 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{lead.emailBody}</p>
            <button
              onClick={copyEmail}
              className="mt-4 text-xs font-semibold rounded-lg px-3 py-1.5 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 cursor-pointer"
            >
              {copied ? 'Copied ✓' : 'Copy email'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

/* ---------- CSV export ---------- */

function exportLeadsCsv(leads: Lead[]) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const rows = [
    ['company', 'website', 'score', 'reasons', 'email_subject', 'email_body'].join(','),
    ...leads.map((lead) =>
      [lead.company, lead.website, lead.score, lead.reasons.join(' | '), lead.emailSubject, lead.emailBody]
        .map(escape)
        .join(',')
    ),
  ];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'marketscout-leads.csv';
  link.click();
  URL.revokeObjectURL(url);
}

/* ---------- The page ---------- */

export default function Home() {
  const [offer, setOffer] = useState(PRESETS[0].offer);
  const [target, setTarget] = useState(PRESETS[0].target);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Stopwatch while the agent works
  useEffect(() => {
    if (!running || startedAt === null) return;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => clearInterval(timer);
  }, [running, startedAt]);

  // How far the agent got: 0 = Discover … 3 = Score & write, 4 = all done
  const phaseIndex =
    leads.length > 0 ? PHASES.length : Math.max(-1, ...steps.map((step) => PHASES.findIndex((p) => p.kind === step.kind)));

  // Reacts to one live message from the agent
  const handleEvent = (event: AgentEvent) => {
    if (event.type === 'status') {
      setStatus(event.message);
    } else if (event.type === 'tool') {
      setSteps((prev) => {
        const step: Step = { id: event.id, kind: kindOf(event), label: event.label, detail: event.detail, status: event.status };
        return prev.some((s) => s.id === event.id) ? prev.map((s) => (s.id === event.id ? step : s)) : [...prev, step];
      });
    } else if (event.type === 'result') {
      setLeads(event.leads);
      setStats(event.stats);
      setStatus(null);
      setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
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
    setStartedAt(Date.now());
    setElapsed(0);

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

  const showActivity = running || steps.length > 0;

  return (
    <main className="min-h-screen bg-[#05080c] text-slate-100 font-sans selection:bg-emerald-400/30">
      {/* Soft green glow at the top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.12),transparent_60%)]" />

      {/* Navigation */}
      <nav className="relative border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </span>
            <span className="font-bold tracking-tight">Market</span>
            <span className="font-light text-slate-400 -ml-1.5">Scout</span>
          </span>
          <a href="#how-it-works" className="text-sm text-slate-400 hover:text-white transition-colors">
            How it works
          </a>
        </div>
      </nav>

      <div className="relative max-w-5xl mx-auto px-6">
        {/* Hero */}
        <header className="pt-16 pb-10 max-w-3xl">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">
            Autonomous AI agent
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Find your next clients.
            <br />
            <span className="text-emerald-400">Let the agent do the research.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed">
            Describe what you offer and who you&apos;re looking for. MarketScout searches the web, verifies official
            websites, reads them, scores every lead and drafts a personal email, live in front of you.
          </p>
        </header>

        {/* Input form */}
        <section className={`${CARD} p-6 md:p-8`}>
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs text-slate-500 self-center mr-1">Try an example:</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                disabled={running}
                onClick={() => {
                  setOffer(preset.offer);
                  setTarget(preset.target);
                }}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all cursor-pointer disabled:opacity-40 ${
                  offer === preset.offer && target === preset.target
                    ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
                    : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">What do you offer?</span>
              <textarea
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                maxLength={300}
                rows={3}
                disabled={running}
                className="mt-2 w-full rounded-2xl bg-black/40 border border-white/10 p-4 text-sm leading-relaxed focus:outline-none focus:border-emerald-400/60 disabled:opacity-60 resize-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-300">Who are you looking for?</span>
              <textarea
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                maxLength={200}
                rows={3}
                disabled={running}
                className="mt-2 w-full rounded-2xl bg-black/40 border border-white/10 p-4 text-sm leading-relaxed focus:outline-none focus:border-emerald-400/60 disabled:opacity-60 resize-none"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <button
              onClick={runAgent}
              disabled={running}
              className="rounded-2xl bg-emerald-400 text-slate-950 font-semibold px-8 py-4 hover:bg-emerald-300 transition-all disabled:opacity-60 cursor-pointer shadow-[0_0_30px_rgba(52,211,153,0.25)]"
            >
              {running ? 'Agent is working…' : 'Find leads →'}
            </button>
            <p className="text-xs text-slate-500">Searches the live web · usually takes 30–60 seconds</p>
          </div>
        </section>

        {/* Live agent activity */}
        {showActivity && (
          <section className={`${CARD} mt-8 p-6 md:p-8`} aria-live="polite">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">Agent activity</h2>
              <span className="text-xs font-mono text-slate-500">
                {running ? `${elapsed}s` : stats ? `${(stats.durationMs / 1000).toFixed(1)}s` : ''}
              </span>
            </div>

            {/* Phase progress */}
            <div className="mt-5 grid grid-cols-4 gap-2">
              {PHASES.map((phase, index) => {
                const done = index < phaseIndex;
                const active = index === phaseIndex && running;
                return (
                  <div key={phase.kind}>
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        done ? 'bg-emerald-400' : active ? 'bg-emerald-400/60 animate-pulse' : 'bg-white/10'
                      }`}
                    />
                    <p className={`mt-2 text-[11px] font-medium ${done || active ? 'text-slate-300' : 'text-slate-600'}`}>
                      {phase.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Steps */}
            <ul className="mt-6 space-y-1">
              {steps.map((step) => (
                <li key={step.id} className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.02]">
                  <span className="mt-0.5 w-7 h-7 flex-none rounded-lg bg-white/[0.04] text-slate-400 flex items-center justify-center">
                    <KindIcon kind={step.kind} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200">{step.label}</p>
                    {step.detail && <p className="text-xs text-slate-500 mt-0.5 break-words">{step.detail}</p>}
                  </div>
                  <span className="mt-1.5 flex-none">
                    <StatusBadge status={step.status} />
                  </span>
                </li>
              ))}
              {status && (
                <li className="flex items-center gap-3 px-3 py-2.5 text-sm text-emerald-300">
                  <span className="w-7 h-7 flex-none flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </span>
                  {status}
                </li>
              )}
            </ul>
          </section>
        )}

        {/* Error */}
        {error && (
          <p className="mt-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-200 p-5 text-sm">{error}</p>
        )}

        {/* Results */}
        {leads.length > 0 && (
          <section id="results" className="mt-12 scroll-mt-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  {leads.length} {leads.length === 1 ? 'lead' : 'leads'} found
                </h2>
                {stats && (
                  <p className="mt-1 text-sm text-slate-500">
                    {stats.searches} web searches · {stats.pagesRead} websites read · {(stats.durationMs / 1000).toFixed(1)}s
                  </p>
                )}
              </div>
              <button
                onClick={() => exportLeadsCsv(leads)}
                className="self-start md:self-auto text-sm font-semibold rounded-xl px-4 py-2.5 border border-white/10 text-slate-200 hover:border-white/25 hover:bg-white/[0.03] cursor-pointer"
              >
                Export CSV
              </button>
            </div>

            <div className="space-y-4">
              {leads.map((lead, index) => (
                <LeadCard key={lead.website} lead={lead} rank={index + 1} />
              ))}
            </div>
          </section>
        )}

        {/* How it works */}
        <section id="how-it-works" className="mt-24 scroll-mt-8">
          <h2 className="text-xs font-semibold tracking-[0.25em] text-slate-500 uppercase">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              { kind: 'search' as StepKind, title: 'Discover', text: 'Searches the web and collects names of real businesses that match your target.' },
              { kind: 'verify' as StepKind, title: 'Verify', text: 'Looks up each business and confirms its official website. No guessed URLs.' },
              { kind: 'read' as StepKind, title: 'Read', text: 'Reads every verified website to understand what the business already has.' },
              { kind: 'write' as StepKind, title: 'Score & write', text: 'Scores how much each lead needs your offer and drafts a personal email.' },
            ].map((item, index) => (
              <div key={item.title} className={`${CARD} p-6`}>
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-400/10 text-emerald-300 flex items-center justify-center">
                    <KindIcon kind={item.kind} />
                  </span>
                  <span className="text-xs font-mono text-slate-600">0{index + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Under the hood (for technical visitors) */}
        <section className="mt-16">
          <h2 className="text-xs font-semibold tracking-[0.25em] text-slate-500 uppercase">Under the hood</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                title: 'Custom tool-calling agent loop',
                text: 'No agent framework. The LLM plans its own research and calls tools (web search, website lookup, page reading) in a hand-written loop with step and credit budgets.',
              },
              {
                title: 'Grounded, verified results',
                text: 'Website addresses are verified by code, and only verified businesses can become leads. The model cannot invent companies or URLs.',
              },
              {
                title: 'Researcher → analyst pattern',
                text: 'One role gathers information, a second role scores leads and writes emails as structured JSON, validated with Zod and self-corrected on failure.',
              },
              {
                title: 'Live streaming & resilience',
                text: 'Every step is streamed to the browser as it happens. Invalid model output, failed searches and unreadable websites never crash the run.',
              },
            ].map((item) => (
              <div key={item.title} className={`${CARD} p-6`}>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-24 mb-10 pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Built by <span className="font-semibold text-slate-300">Bodie Codes</span>
          </span>
          <span>Next.js · TypeScript · Groq LLM · Tavily Search · Zod</span>
        </footer>
      </div>
    </main>
  );
}