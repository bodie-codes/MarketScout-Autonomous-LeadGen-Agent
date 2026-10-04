'use client';

import { useChat } from '@ai-sdk/react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function MarketScout() {
  const chat = useChat({
    api: '/api/chat',
    onError: (err) => console.error('[Frontend Error]:', err),
  });

  const [localText, setLocalText] = useState('');

  const handleSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!localText.trim()) return;

    const messageText = localText;
    setLocalText('');

    const chatInstance = chat as any;
    if (typeof chatInstance.sendMessage === 'function') {
      chatInstance.sendMessage({ text: messageText });
    } else if (typeof chatInstance.append === 'function') {
      chatInstance.append({ role: 'user', content: messageText });
    }
  };

  const isSending = chat.status === 'submitted' || chat.status === 'streaming';
  const chatMessages = chat.messages || [];

  // Extrakce textu ze všech možných struktur zpráv
  const getMessageText = (m: any): string => {
    if (!m) return '';

    if (typeof m.content === 'string' && m.content.trim()) return m.content;
    if (typeof m.text === 'string' && m.text.trim()) return m.text;

    if (Array.isArray(m.parts)) {
      const partsText = m.parts
        .map((p: any) => {
          if (typeof p === 'string') return p;
          if (p?.type === 'text') return p.text || p.content || '';
          if (p?.type === 'reasoning') return p.reasoning || p.text || '';
          if (typeof p?.text === 'string') return p.text;
          return '';
        })
        .filter(Boolean)
        .join('\n');
      if (partsText.trim()) return partsText;
    }

    if (Array.isArray(m.content)) {
      const contentText = m.content
        .map((p: any) => (typeof p === 'string' ? p : p?.text || p?.content || ''))
        .filter(Boolean)
        .join('\n');
      if (contentText.trim()) return contentText;
    }

    return '';
  };

  // Extrakce průběhu nástrojů
  const getMessageTools = (m: any): any[] => {
    if (!m) return [];
    const tools: any[] = [];

    const add = (item: any) => {
      if (!item) return;
      const actual = item.toolInvocation || item;
      if (actual.toolName || actual.toolCallId || actual.name || actual.args || actual.type === 'tool-invocation') {
        tools.push(actual);
      }
    };

    if (Array.isArray(m.toolInvocations)) m.toolInvocations.forEach(add);
    if (Array.isArray(m.parts)) m.parts.forEach(add);
    if (Array.isArray(m.content)) m.content.forEach(add);

    return tools;
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Market<span className="font-light text-slate-500">Scout</span>
            </h1>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
            Autonomous LeadGen Agent
          </span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 pb-32">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-2">
              <Bot className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">How can I help you prospect today?</h2>
            <p className="text-slate-500 max-w-md">
              Enter a company name, website, or LinkedIn profile. I'll analyze their business and craft a highly converting, personalized cold email.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {chatMessages.map((m) => {
              const text = getMessageText(m);
              const tools = getMessageTools(m);

              return (
                <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role !== 'user' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-indigo-600" />
                    </div>
                  )}
                  
                  <div className={`flex flex-col gap-2 max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {/* Odznaky průzkumu webu */}
                    {tools.map((tool, idx) => {
                      const toolCallId = tool.toolCallId || tool.id || idx;
                      const target = tool.args?.url || tool.args?.companyName || tool.args?.query || 'fiat.cz';
                      const isDone = tool.state === 'result' || Boolean(tool.result) || tool.type === 'tool-result';

                      return (
                        <div key={toolCallId} className="flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm">
                          {isDone ? (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              <span>Dokončený průzkum pro: <strong className="font-semibold text-slate-800">{target}</strong></span>
                            </>
                          ) : (
                            <>
                              <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin flex-shrink-0" />
                              <span>Stahuji data z: <strong className="font-semibold text-slate-800">{target}</strong>...</span>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Vykreslení textu e-mailu */}
                    {text ? (
                      <div 
                        className={`px-5 py-4 rounded-2xl ${
                          m.role === 'user' 
                            ? 'bg-slate-900 text-white rounded-br-none' 
                            : 'bg-white border border-slate-100 shadow-sm rounded-bl-none text-slate-700 whitespace-pre-wrap'
                        }`}
                      >
                        {text}
                      </div>
                    ) : null}
                  </div>

                  {m.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                  )}
                </div>
              );
            })}

            {isSending && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-white border border-slate-100 px-4 py-3 rounded-2xl shadow-sm">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span>MarketScout analyzuje firmu a píše e-mail...</span>
                </div>
              </div>
            )}

            {chat.error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                Chyba při komunikaci s agentem: {chat.error.message}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA] to-transparent pt-10 pb-6">
        <div className="max-w-4xl mx-auto px-6">
          <form 
            onSubmit={handleSend}
            className="bg-white border border-slate-200 rounded-2xl shadow-lg flex items-center p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
          >
            <input
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              placeholder="e.g., Target: Stripe (stripe.com)..."
              className="flex-1 px-4 py-3 bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || !localText.trim()} 
              className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}