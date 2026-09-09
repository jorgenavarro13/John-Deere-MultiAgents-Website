## John Deere MultiAgents System

Repository created to host the [Unity simulation](https://github.com/Fernando94654/John-Deere-Multi-Agent-Simulation) developed for the MultiAgents and Computational Graphics AD2026 subject

### Tech Stack
- React
- Tailwind


### OpenClaw chat

The simulation page includes a floating **Asistente de campo** panel. It uses the
existing `VITE_API_URL` (default `http://localhost:8080`) and optional
`VITE_API_TOKEN`, and sends messages to `POST /api/chat` on the simulation server.
No OpenClaw or model credential belongs in a `VITE_` variable.

Run the updated `John-Deere-Multi-Agent-System` server with `--web-port 8080
--with-mcp`, with the OpenClaw gateway and its `farm-manager` agent configured.
The existing `agent/run-demo.sh` starts this setup. Restart an older server to
load the new chat endpoint. For a deployed website, `VITE_API_URL` must point to
an HTTPS-accessible simulation API; GitHub Pages only hosts the frontend.

Chat stays available through the setup wizard and simulation. Closing the panel
keeps the current conversation; **+** starts a new one. Reloading or leaving the
simulation page starts a new chat. Enter sends; Shift + Enter adds a line; Escape
closes and returns focus to the floating button. Agent instructions can change
the running simulation. Failed requests are never automatically retried.

Replies stream as OpenClaw generates them. The backend uses the local gateway
HTTP endpoint; configure it as described in `Servidor/WEB_API.md`. Farm-manager
uses low reasoning and is asked for 1–3 sentences unless more detail is requested.
