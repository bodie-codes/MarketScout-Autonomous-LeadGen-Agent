import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

export const maxDuration = 60;

export async function GET() {
  return Response.json({
    status: 'OK',
    message: 'MarketScout API route je aktivní.',
    envCheck: {
      hasGroqKey: Boolean(process.env.GROQ_API_KEY),
      hasTavilyKey: Boolean(process.env.TAVILY_API_KEY),
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[API] Příchozí data:', JSON.stringify(body));

    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY není nastaven v .env.local');
    }

    let rawMessages = body.messages;
    if (!rawMessages && body.message) rawMessages = [body.message];
    if (!rawMessages && body.prompt) rawMessages = [{ role: 'user', content: body.prompt }];

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      const fallbackText = typeof body === 'string' ? body : (body.text || body.content || 'fiat.cz');
      rawMessages = [{ role: 'user', content: fallbackText }];
    }

    const formattedMessages = rawMessages.map((m: any) => {
      let text = '';
      if (typeof m.content === 'string') text = m.content;
      else if (m.text) text = m.text;
      else if (Array.isArray(m.parts)) text = m.parts.map((p: any) => p.text || '').join('');
      else text = String(m.content || '');

      return {
        role: m.role || 'user',
        content: text || 'fiat.cz',
      };
    });

    const result = streamText({
      model: groq('openai/gpt-oss-120b'),
      system: `You are MarketScout, an elite autonomous B2B Lead Generation Agent.
      
      CRITICAL WORKFLOW:
      1. First, use the 'scrapeWebsite' tool to gather real information about the requested company.
      2. IMMEDIATELY AFTER receiving the tool result, analyze the scraped data and WRITE THE COLD EMAIL as your text output.
      3. Do NOT stop after tool execution. You MUST always output the final cold email text (under 150 words) targeting a decision-maker.`,
      messages: formattedMessages,
      tools: {
        scrapeWebsite: tool({
          description: 'Searches the web and extracts key information from a company website or URL.',
          parameters: z.object({
            url: z.string().optional().describe('The URL or domain of the company (e.g., vercel.com or fiat.cz)'),
            companyName: z.string().optional().describe('The name of the company to help with search context'),
          }),
          execute: async ({ url, companyName }) => {
            const target = url || companyName || 'fiat.cz';
            console.log(`[Agent Tool] Průzkum pro: ${companyName || target} na URL: ${target}`);
            
            try {
              const cleanUrl = String(target).trim();
              const targetUrl = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;

              const response = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  api_key: process.env.TAVILY_API_KEY,
                  query: `What is the core business, value proposition, and target audience of ${companyName || cleanUrl} (${targetUrl})?`,
                  search_depth: 'advanced',
                  include_answer: true,
                }),
              });

              if (!response.ok) throw new Error(`Tavily API status: ${response.status}`);
              const data = await response.json();
              
              const summaryText = data.answer || 'Společnost nabízí automobilové produkty a služby.';
              
              return `SCRAPING COMPLETED FOR ${cleanUrl}.
Summary: ${summaryText}

INSTRUCTION: Now write the personalized B2B cold email based on these findings.`;
            } catch (error) {
              console.error('[Tool Error] Scraping selhal:', error);
              return 'Scraping selhal. Vygeneruj B2B cold email na základě obecných znalostí o značce.';
            }
          },
        }),
      },
      maxSteps: 5, 
    });

    const res = result as any;

    // Bezpečná kontrola přítomnosti metody před jejím zavoláním
    if (typeof res.toDataStreamResponse === 'function') {
      return res.toDataStreamResponse();
    }

    // BEZPEČNÝ VLASTNÍ ADAPTÉR PRO DATA STREAM PROTOKOL
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (res.fullStream) {
            for await (const chunk of res.fullStream) {
              if (chunk.type === 'text-delta') {
                controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk.textDelta)}\n`));
              } else if (chunk.type === 'tool-call') {
                controller.enqueue(encoder.encode(`9:${JSON.stringify({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  args: chunk.args
                })}\n`));
              } else if (chunk.type === 'tool-result') {
                controller.enqueue(encoder.encode(`a:${JSON.stringify({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  args: chunk.args,
                  result: chunk.result
                })}\n`));
              }
            }
          } else if (res.textStream) {
            for await (const textChunk of res.textStream) {
              controller.enqueue(encoder.encode(`0:${JSON.stringify(textChunk)}\n`));
            }
          }
          controller.enqueue(encoder.encode(`e:${JSON.stringify({ finishReason: 'stop' })}\n`));
          controller.close();
        } catch (err: any) {
          console.error('[Stream Adapter Error]:', err);
          controller.enqueue(encoder.encode(`3:${JSON.stringify(err.message || 'Stream error')}\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Data-Stream': 'v1',
      },
    });

  } catch (error: any) {
    console.error('[API Fatal Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}