// Shared types used by the agent, the API and the page

export type Lead = {
    company: string;
    website: string;
    score: number;
    reasons: string[];
    emailSubject: string;
    emailBody: string;
  };
  
  export type AgentStats = {
    steps: number;
    searches: number;
    pagesRead: number;
    durationMs: number;
  };
  
  export type ToolName = "search_web" | "read_websites" | "write_leads";
  
  // Live messages the agent sends to the browser while it works
  export type AgentEvent =
    | { type: "status"; message: string }
    | {
        type: "tool";
        id: string;
        tool: ToolName;
        status: "working" | "done" | "failed";
        label: string;
        detail?: string;
      }
    | { type: "result"; leads: Lead[]; stats: AgentStats }
    | { type: "error"; error: string };