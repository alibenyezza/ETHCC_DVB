import * as http from "http";
import { Agent } from "../core/Agent";
import { AgentProposal, TEEResponse } from "../core/types";

/**
 * HTTP API server for agent communication.
 *
 * Exposes endpoints for:
 * - TEE (Julie) to fetch proposals and agent state
 * - Dashboard to display real-time agent status
 *
 * Endpoints:
 *   GET  /status              — All agents status summary
 *   GET  /agents/:chain       — Single agent detailed state
 *   GET  /proposals           — Latest proposals from all agents
 *   GET  /proposals/:chain    — Latest proposal from one agent
 *   POST /tee/response/:chain — TEE sends response to an agent
 *   GET  /tee/response/:chain — Agent polls for its TEE response
 */
export class AgentServer {
  private server: http.Server;
  private agents: Map<string, Agent> = new Map();
  private latestProposals: Map<string, AgentProposal> = new Map();
  private teeResponses: Map<string, TEEResponse> = new Map();
  private port: number;

  constructor(port: number = 3100) {
    this.port = port;
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
  }

  /**
   * Register agents with the server.
   */
  registerAgents(agents: Agent[]): void {
    for (const agent of agents) {
      this.agents.set(agent.chain.toLowerCase(), agent);
    }
  }

  /**
   * Store the latest proposal from an agent (called by the agent cycle).
   */
  updateProposal(chain: string, proposal: AgentProposal): void {
    this.latestProposals.set(chain.toLowerCase(), proposal);
  }

  /**
   * Start listening.
   */
  start(): void {
    this.server.listen(this.port, () => {
      console.log(`[API] Agent server listening on http://localhost:${this.port}`);
      console.log(`[API] Endpoints:`);
      console.log(`[API]   GET  /status              — All agents summary`);
      console.log(`[API]   GET  /agents/:chain       — Agent state`);
      console.log(`[API]   GET  /proposals           — All latest proposals`);
      console.log(`[API]   GET  /proposals/:chain    — Single proposal`);
      console.log(`[API]   POST /tee/response/:chain — TEE response`);
    });
  }

  stop(): void {
    this.server.close();
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url || "/", `http://localhost:${this.port}`);
    const path = url.pathname;
    const method = req.method || "GET";

    // CORS headers for dashboard
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // GET /status
      if (method === "GET" && path === "/status") {
        return this.handleStatus(res);
      }

      // GET /agents/:chain
      const agentMatch = path.match(/^\/agents\/(\w+)$/);
      if (method === "GET" && agentMatch) {
        return this.handleAgentState(res, agentMatch[1]);
      }

      // GET /proposals
      if (method === "GET" && path === "/proposals") {
        return this.handleAllProposals(res);
      }

      // GET /proposals/:chain
      const proposalMatch = path.match(/^\/proposals\/(\w+)$/);
      if (method === "GET" && proposalMatch) {
        return this.handleProposal(res, proposalMatch[1]);
      }

      // POST /tee/responses — Batch: TEE sends all responses in one call
      if (method === "POST" && path === "/tee/responses") {
        return this.handleBatchTEEResponses(req, res);
      }

      // POST /tee/response/:chain — TEE sends response
      const teePostMatch = path.match(/^\/tee\/response\/(\w+)$/);
      if (method === "POST" && teePostMatch) {
        return this.handleTEEResponse(req, res, teePostMatch[1]);
      }

      // GET /tee/response/:chain — Agent polls for its response
      const teeGetMatch = path.match(/^\/tee\/response\/(\w+)$/);
      if (method === "GET" && teeGetMatch) {
        return this.handleGetTEEResponse(res, teeGetMatch[1]);
      }

      // 404
      this.sendJSON(res, 404, { error: "Not found" });
    } catch (error: any) {
      this.sendJSON(res, 500, { error: error.message });
    }
  }

  private handleStatus(res: http.ServerResponse): void {
    const status: any[] = [];
    for (const [chain, agent] of this.agents) {
      const state = agent.getState();
      const proposal = this.latestProposals.get(chain);
      status.push({
        chain: state.chain,
        running: state.running,
        cycleCount: state.cycleCount,
        currentCapital: state.currentCapital,
        positions: state.positions,
        zgComputeConnected: state.zgComputeConnected,
        zgStorageConnected: state.zgStorageConnected,
        latestProposal: proposal ? {
          timestamp: proposal.timestamp,
          confidence: proposal.confidence,
          safety: proposal.safety.overall_score,
          positions: proposal.strategy.positions.length,
          optimalCapital: proposal.optimal_capital,
        } : null,
      });
    }
    this.sendJSON(res, 200, { agents: status, count: status.length, timestamp: Date.now() });
  }

  private handleAgentState(res: http.ServerResponse, chain: string): void {
    const agent = this.agents.get(chain.toLowerCase());
    if (!agent) {
      return this.sendJSON(res, 404, { error: `Agent ${chain} not found` });
    }
    this.sendJSON(res, 200, agent.getState());
  }

  private handleAllProposals(res: http.ServerResponse): void {
    const proposals: Record<string, AgentProposal> = {};
    for (const [chain, proposal] of this.latestProposals) {
      proposals[chain] = proposal;
    }
    this.sendJSON(res, 200, { proposals, count: this.latestProposals.size, timestamp: Date.now() });
  }

  private handleProposal(res: http.ServerResponse, chain: string): void {
    const proposal = this.latestProposals.get(chain.toLowerCase());
    if (!proposal) {
      return this.sendJSON(res, 404, { error: `No proposal for ${chain}` });
    }
    this.sendJSON(res, 200, proposal);
  }

  /**
   * Batch endpoint: receives all TEE responses in one POST.
   * Body: { responses: TEEResponse[] }
   */
  private handleBatchTEEResponses(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { responses } = JSON.parse(body) as { responses: TEEResponse[] };
        let stored = 0;
        for (const teeResponse of responses) {
          const chain = (teeResponse.agent || "").toLowerCase();
          if (chain) {
            this.teeResponses.set(chain, teeResponse);
            stored++;
          }
        }
        console.log(`[API] Batch TEE responses: ${stored} stored (${responses.filter(r => r.approved).length} approved)`);
        this.sendJSON(res, 200, { received: stored });
      } catch {
        this.sendJSON(res, 400, { error: "Invalid JSON body" });
      }
    });
  }

  private handleTEEResponse(req: http.IncomingMessage, res: http.ServerResponse, chain: string): void {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const teeResponse = JSON.parse(body) as TEEResponse;
        // Store response — agent will pick it up via GET /tee/response/:chain
        this.teeResponses.set(chain.toLowerCase(), teeResponse);
        console.log(`[API] Received TEE response for ${chain}: ${teeResponse.approved ? "APPROVED" : "REJECTED"} (${teeResponse.txBlobs?.length || 0} txBlobs)`);
        this.sendJSON(res, 200, { received: true, chain });
      } catch {
        this.sendJSON(res, 400, { error: "Invalid JSON body" });
      }
    });
  }

  /**
   * Agent polls for its TEE response. Returns the response and deletes it (consume once).
   */
  private handleGetTEEResponse(res: http.ServerResponse, chain: string): void {
    const key = chain.toLowerCase();
    const teeResponse = this.teeResponses.get(key);
    if (!teeResponse) {
      return this.sendJSON(res, 404, { error: `No TEE response for ${chain}` });
    }
    // Consume: delete after delivering so the agent doesn't re-process
    this.teeResponses.delete(key);
    this.sendJSON(res, 200, teeResponse);
  }

  private sendJSON(res: http.ServerResponse, status: number, data: any): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data, null, 2));
  }
}
