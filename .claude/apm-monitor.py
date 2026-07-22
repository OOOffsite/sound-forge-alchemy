#!/usr/bin/env python3
"""APM v3 - Sound Forge Alchemy Analysis Squadron
Project-specific CCEM APM dashboard for monitoring codebase analysis agents.
"""

import http.server
import json
import os
import time
import threading
from datetime import datetime, timezone
from pathlib import Path

PORT = 3032
PROJECT_ROOT = "/Users/jeremiah/Developer/sound-forge-alchemy"
PROJECT_NAME = "Sound Forge Alchemy - Codebase Analysis"

# --- Notification System ---
_notifications = []
_notification_id = 0
_notification_lock = threading.Lock()

# --- Agent Registry (populated by deployer) ---
AGENTS = {}
AGENTS_LOCK = threading.Lock()

# --- Tasks tracked ---
TASKS = []

SLASH_COMMANDS = [
    {"name": "agents", "description": "Deploy multiple specialized agents concurrently", "status": "active", "category": "deployment"},
    {"name": "ccem-apm", "description": "CCEM APM - Agentic Performance Monitor", "status": "active", "category": "monitoring"},
    {"name": "refactor-max", "description": "Maximum refactoring with safety guarantees", "status": "available", "category": "methodology"},
    {"name": "tdd:spawn", "description": "Spawn TDD agent squadron", "status": "available", "category": "methodology"},
    {"name": "fix:build", "description": "Fix build failures and TypeScript errors", "status": "available", "category": "fix"},
    {"name": "fix:tests", "description": "Fix test suite failures", "status": "available", "category": "fix"},
    {"name": "review", "description": "Code review and quality analysis", "status": "available", "category": "quality"},
]


def add_notification(title, body, category="info", agent_id=None):
    global _notification_id
    with _notification_lock:
        _notification_id += 1
        notif = {
            "id": _notification_id,
            "title": title,
            "body": body,
            "category": category,
            "agent_id": agent_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "read": False,
            "requires_input": False,
            "input_options": None,
        }
        _notifications.insert(0, notif)
        if len(_notifications) > 200:
            _notifications.pop()
        return _notification_id


def register_agent(agent_id, name, tier, deps=None, context=None):
    with AGENTS_LOCK:
        AGENTS[agent_id] = {
            "name": name,
            "tier": tier,
            "status": "running",
            "deps": deps or [],
            "plane": context or {},
        }
    add_notification(f"Agent Deployed", f'"{name}" (Tier {tier}) started', category="info", agent_id=agent_id)


def get_agent_output_stats(agent_id):
    """Check for task output files in the Claude Code tasks directory."""
    # Check multiple possible output locations
    possible_dirs = [
        f"/private/tmp/claude-503/-Users-jeremiah-Developer-sound-forge-alchemy/tasks",
        f"/private/tmp/claude-503/tasks",
    ]

    for tasks_dir in possible_dirs:
        output_file = os.path.join(tasks_dir, f"{agent_id}.output")
        if os.path.exists(output_file):
            return _parse_output_file(output_file)

    # Also check the agent registry file we maintain
    agent_file = os.path.join(PROJECT_ROOT, ".claude", "agents", "outputs", f"{agent_id}.json")
    if os.path.exists(agent_file):
        try:
            with open(agent_file) as f:
                return json.load(f)
        except Exception:
            pass

    return {"lines": 0, "tokens_in": 0, "tokens_out": 0, "tokens_cache": 0,
            "tokens_total": 0, "tools_used": 0, "last_message": "", "file_size": 0, "api_calls": 0}


def _parse_output_file(output_file):
    file_size = os.path.getsize(output_file)
    lines = tokens_in = tokens_out = tokens_cache = tools_used = api_calls = 0
    last_text = ""
    try:
        with open(output_file, "r") as f:
            for line in f:
                lines += 1
                try:
                    d = json.loads(line.strip())
                    msg = d.get("message", {})
                    usage = msg.get("usage", {})
                    t_in = usage.get("input_tokens", 0)
                    t_out = usage.get("output_tokens", 0)
                    cache_create = usage.get("cache_creation_input_tokens", 0)
                    cache_read = usage.get("cache_read_input_tokens", 0)
                    if t_in or t_out:
                        api_calls += 1
                        tokens_in += t_in
                        tokens_out += t_out
                        tokens_cache += cache_create + cache_read
                    content = msg.get("content", [])
                    if isinstance(content, list):
                        for c in content:
                            if not isinstance(c, dict):
                                continue
                            if c.get("type") == "tool_use":
                                tools_used += 1
                            if c.get("type") == "text":
                                t = c.get("text", "")
                                if len(t) > 10:
                                    last_text = t[:300]
                except (json.JSONDecodeError, KeyError, TypeError):
                    pass
    except Exception:
        pass
    return {
        "lines": lines, "tokens_in": tokens_in, "tokens_out": tokens_out,
        "tokens_cache": tokens_cache, "tokens_total": tokens_in + tokens_out + tokens_cache,
        "tools_used": tools_used, "api_calls": api_calls,
        "last_message": last_text, "file_size": file_size,
    }


def check_agent_completion(agent_id):
    """Check if agent output indicates completion."""
    # Check agent status file
    status_file = os.path.join(PROJECT_ROOT, ".claude", "agents", "outputs", f"{agent_id}.status")
    if os.path.exists(status_file):
        try:
            with open(status_file) as f:
                status = f.read().strip()
            return status == "completed"
        except Exception:
            pass
    return False


def get_api_data():
    now = datetime.now(timezone.utc).isoformat()
    agents_data = []
    total_tokens_in = total_tokens_out = total_tokens_cache = total_tools = total_api_calls = 0
    newly_completed = []

    with AGENTS_LOCK:
        agent_snapshot = dict(AGENTS)

    for aid, info in agent_snapshot.items():
        stats = get_agent_output_stats(aid)
        was_running = info["status"] == "running"
        if info["status"] != "completed" and check_agent_completion(aid):
            with AGENTS_LOCK:
                AGENTS[aid]["status"] = "completed"
            info["status"] = "completed"
            if was_running:
                newly_completed.append(info["name"])
        agents_data.append({
            "id": aid, "name": info["name"], "tier": info["tier"],
            "status": info["status"], "deps": info.get("deps", []),
            "plane": info.get("plane", {}),
            "lines": stats["lines"], "tokens_in": stats["tokens_in"],
            "tokens_out": stats["tokens_out"], "tokens_cache": stats["tokens_cache"],
            "tokens_total": stats.get("tokens_total", 0), "tools_used": stats["tools_used"],
            "api_calls": stats["api_calls"],
            "file_size_kb": round(stats["file_size"] / 1024, 1) if stats["file_size"] else 0,
            "last_message": stats["last_message"],
        })
        total_tokens_in += stats["tokens_in"]
        total_tokens_out += stats["tokens_out"]
        total_tokens_cache += stats["tokens_cache"]
        total_tools += stats["tools_used"]
        total_api_calls += stats["api_calls"]

    for name in newly_completed:
        add_notification("Agent Completed", f'"{name}" has finished execution', category="success")

    completed = sum(1 for a in agents_data if a["status"] == "completed")
    running = sum(1 for a in agents_data if a["status"] == "running")
    pending = sum(1 for a in agents_data if a["status"] == "pending")

    edges = []
    with AGENTS_LOCK:
        for aid, info in AGENTS.items():
            for dep in info.get("deps", []):
                edges.append({"source": dep, "target": aid})

    unread_count = sum(1 for n in _notifications if not n["read"])

    return {
        "timestamp": now,
        "session_id": "sfa-analysis-" + datetime.now().strftime("%Y%m%d"),
        "project": PROJECT_NAME,
        "summary": {
            "total_agents": len(agents_data), "completed": completed, "running": running,
            "pending": pending,
            "total_tokens_in": total_tokens_in, "total_tokens_out": total_tokens_out,
            "total_tokens_cache": total_tokens_cache,
            "total_tokens": total_tokens_in + total_tokens_out + total_tokens_cache,
            "total_tool_calls": total_tools, "total_api_calls": total_api_calls,
        },
        "agents": agents_data, "edges": edges, "tasks": TASKS,
        "plane": {
            "workspace": "sound-forge-alchemy",
            "project_name": "Alchemy2 Refactor",
            "states": {
                "Analysis": {"id": "analysis", "color": "#58a6ff", "count": len([a for a in agents_data if a["status"] == "running"])},
                "Complete": {"id": "complete", "color": "#3fb950", "count": completed},
                "Pending": {"id": "pending", "color": "#8b949e", "count": pending},
            },
            "total_issues": len(agents_data),
            "modules": {},
        },
        "notifications": {"unread": unread_count, "recent": _notifications[:20]},
        "ralph": None,
        "slash_commands": SLASH_COMMANDS,
        "input_requests": [],
    }


# Initialize with startup notification
add_notification("APM v3 Started", f"Sound Forge Alchemy analysis squadron monitor initialized on port {PORT}", category="system")


DASHBOARD_HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>APM v3 - Sound Forge Alchemy Analysis</title>
<script src="https://d3js.org/d3.v7.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0e17; color: #c9d1d9; font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; font-size: 13px; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
  .header { background: linear-gradient(135deg, #161b22 0%, #0d1117 100%); border-bottom: 1px solid #30363d; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; z-index: 100; }
  .header h1 { font-size: 14px; color: #58a6ff; font-weight: 600; }
  .header .meta { color: #8b949e; font-size: 11px; display: flex; align-items: center; gap: 12px; }
  .live-dot { display: inline-block; width: 8px; height: 8px; background: #3fb950; border-radius: 50%; margin-right: 6px; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  .bell-container { position: relative; cursor: pointer; }
  .bell-icon { width: 20px; height: 20px; fill: #8b949e; transition: fill 0.2s; }
  .bell-icon:hover { fill: #58a6ff; }
  .bell-badge { position: absolute; top: -4px; right: -6px; background: #f85149; color: #fff; font-size: 9px; font-weight: 700; min-width: 16px; height: 16px; border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 0 4px; }
  .bell-badge.hidden { display: none; }
  .notif-dropdown { position: absolute; top: 32px; right: 0; width: 380px; max-height: 480px; background: #161b22; border: 1px solid #30363d; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 200; display: none; overflow: hidden; }
  .notif-dropdown.open { display: block; animation: fadeIn 0.15s ease; }
  .notif-dropdown-header { padding: 10px 14px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center; }
  .notif-dropdown-header h3 { font-size: 12px; color: #e6edf3; }
  .notif-dropdown-header .mark-read { font-size: 10px; color: #58a6ff; cursor: pointer; }
  .notif-dropdown-body { max-height: 400px; overflow-y: auto; }
  .notif-item { padding: 10px 14px; border-bottom: 1px solid #21262d; cursor: pointer; transition: background 0.15s; }
  .notif-item:hover { background: #1c2128; }
  .notif-item.unread { border-left: 3px solid #58a6ff; }
  .notif-item .notif-title { font-size: 11px; font-weight: 600; color: #e6edf3; margin-bottom: 2px; }
  .notif-item .notif-body { font-size: 10px; color: #8b949e; line-height: 1.3; }
  .notif-item .notif-time { font-size: 9px; color: #484f58; margin-top: 3px; }
  .notif-cat { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 9px; font-weight: 600; margin-right: 4px; }
  .notif-cat.success { background: #23863533; color: #3fb950; }
  .notif-cat.info { background: #1f6feb33; color: #58a6ff; }
  .notif-cat.warning { background: #9e6a0333; color: #d29922; }
  .notif-cat.system { background: #484f5833; color: #8b949e; }
  .notif-cat.error { background: #f8514933; color: #f85149; }
  .main-layout { display: flex; flex: 1; overflow: hidden; }
  .left-panel { flex: 1; overflow-y: auto; padding: 10px; }
  .right-panel { width: 380px; border-left: 1px solid #30363d; background: #0d1117; overflow-y: auto; flex-shrink: 0; }
  .tab-bar { display: flex; border-bottom: 1px solid #30363d; background: #161b22; flex-shrink: 0; }
  .tab-btn { flex: 1; padding: 8px 4px; text-align: center; font-size: 10px; color: #8b949e; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .tab-btn:hover { color: #c9d1d9; background: #1c2128; }
  .tab-btn.active { color: #58a6ff; border-bottom-color: #58a6ff; }
  .tab-content { display: none; overflow-y: auto; flex: 1; }
  .tab-content.active { display: block; }
  .grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-bottom: 10px; }
  .stat-card { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 8px; text-align: center; }
  .stat-card .value { font-size: 20px; font-weight: 700; color: #58a6ff; }
  .stat-card .label { font-size: 9px; color: #8b949e; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px; }
  .progress-bar { height: 4px; background: #21262d; border-radius: 2px; margin-bottom: 10px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #3fb950, #58a6ff, #bc8cff); border-radius: 2px; transition: width 0.8s ease; }
  .graph-container { background: #161b22; border: 1px solid #30363d; border-radius: 6px; margin-bottom: 10px; overflow: hidden; }
  .graph-title { font-size: 9px; color: #8b949e; text-transform: uppercase; letter-spacing: 1.5px; padding: 6px 10px; border-bottom: 1px solid #21262d; }
  #dep-graph { width: 100%; }
  .node circle { stroke-width: 2px; cursor: pointer; transition: r 0.2s; }
  .node circle:hover { r: 18; }
  .node text { fill: #c9d1d9; font-size: 9px; font-family: 'SF Mono', monospace; pointer-events: none; }
  .link { stroke-opacity: 0.5; fill: none; }
  .tier-label { fill: #484f58; font-size: 10px; font-family: 'SF Mono', monospace; text-transform: uppercase; letter-spacing: 2px; }
  .section { margin-bottom: 10px; }
  .section-title { font-size: 9px; color: #8b949e; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
  .agent-row { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 6px 10px; margin-bottom: 4px; display: grid; grid-template-columns: 24px 1fr 60px 50px 50px 50px 70px; align-items: center; gap: 6px; transition: all 0.2s; cursor: pointer; font-size: 11px; }
  .agent-row:hover { border-color: #58a6ff; background: #161b2288; }
  .agent-row.selected { border-color: #58a6ff; box-shadow: 0 0 0 1px #58a6ff33; }
  .tier-badge { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; }
  .tier-1 { background: #1f6feb33; color: #58a6ff; border: 1px solid #1f6feb; }
  .tier-2 { background: #8957e533; color: #bc8cff; border: 1px solid #8957e5; }
  .tier-3 { background: #f0883e33; color: #f0883e; border: 1px solid #f0883e; }
  .agent-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .agent-name .id { color: #484f58; font-size: 9px; }
  .metric { text-align: right; }
  .metric .val { color: #e6edf3; font-weight: 600; }
  .metric .unit { color: #484f58; font-size: 8px; }
  .status { padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; text-align: center; display: inline-block; }
  .status.completed { background: #23863533; color: #3fb950; border: 1px solid #23863566; }
  .status.running { background: #9e6a0333; color: #d29922; border: 1px solid #9e6a0366; animation: pulse 2s infinite; }
  .status.pending { background: #484f5833; color: #8b949e; border: 1px solid #484f5866; }
  .col-header { font-size: 8px; color: #484f58; text-transform: uppercase; letter-spacing: 1px; padding: 2px 10px; display: grid; grid-template-columns: 24px 1fr 60px 50px 50px 50px 70px; gap: 6px; }
  .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .task-list { background: #161b22; border: 1px solid #30363d; border-radius: 6px; overflow: hidden; max-height: 180px; overflow-y: auto; }
  .task-row { display: grid; grid-template-columns: 32px 1fr 80px; padding: 4px 8px; border-bottom: 1px solid #21262d; align-items: center; font-size: 10px; }
  .task-row:last-child { border-bottom: none; }
  .task-id { color: #484f58; }
  .inspector-header { padding: 10px 14px; border-bottom: 1px solid #30363d; background: #161b22; }
  .inspector-header h2 { font-size: 11px; color: #58a6ff; text-transform: uppercase; letter-spacing: 1px; }
  .inspector-section { padding: 10px 14px; border-bottom: 1px solid #21262d; }
  .inspector-section h3 { font-size: 9px; color: #8b949e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .inspector-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 10px; }
  .inspector-row .key { color: #8b949e; }
  .inspector-row .val { color: #e6edf3; font-weight: 500; }
  .plane-state { display: flex; gap: 4px; flex-wrap: wrap; padding: 4px 0; }
  .plane-pill { padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; }
  .no-selection { color: #484f58; font-size: 11px; text-align: center; padding: 30px 16px; }
  .cmd-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; border-bottom: 1px solid #21262d; font-size: 10px; }
  .cmd-item .cmd-name { color: #bc8cff; font-weight: 600; }
  .cmd-item .cmd-desc { color: #8b949e; font-size: 9px; flex: 1; margin: 0 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cmd-status { padding: 1px 6px; border-radius: 8px; font-size: 8px; font-weight: 600; }
  .cmd-status.active { background: #23863533; color: #3fb950; }
  .cmd-status.available { background: #1f6feb33; color: #58a6ff; }
  .cmd-status.completed { background: #484f5833; color: #8b949e; }
  #inspector-dep-graph { width: 100%; background: #0d1117; border-radius: 4px; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #0a0e17; }
  ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #484f58; }
</style>
</head>
<body>
<div class="header">
  <h1><span class="live-dot"></span>APM v3 - Sound Forge Alchemy</h1>
  <div class="meta">
    <span id="project"></span>
    <span>|</span>
    <span id="clock"></span>
    <span>|</span>
    <span id="refresh-indicator" style="color:#3fb950">LIVE</span>
    <div class="bell-container" onclick="toggleNotifDropdown(event)">
      <svg class="bell-icon" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
      </svg>
      <div class="bell-badge hidden" id="bell-badge">0</div>
      <div class="notif-dropdown" id="notif-dropdown">
        <div class="notif-dropdown-header">
          <h3>Notifications</h3>
          <span class="mark-read" onclick="markAllRead(event)">Mark all read</span>
        </div>
        <div class="notif-dropdown-body" id="notif-list"></div>
      </div>
    </div>
  </div>
</div>
<div class="main-layout">
  <div class="left-panel">
    <div class="grid">
      <div class="stat-card"><div class="value" id="s-agents">0</div><div class="label">Agents</div></div>
      <div class="stat-card"><div class="value" id="s-completed" style="color:#3fb950">0</div><div class="label">Done</div></div>
      <div class="stat-card"><div class="value" id="s-running" style="color:#d29922">0</div><div class="label">Running</div></div>
      <div class="stat-card"><div class="value" id="s-tokens-in" style="color:#d29922">0</div><div class="label">Tokens In</div></div>
      <div class="stat-card"><div class="value" id="s-tools" style="color:#bc8cff">0</div><div class="label">Tool Calls</div></div>
      <div class="stat-card"><div class="value" id="s-api" style="color:#58a6ff">0</div><div class="label">API Calls</div></div>
    </div>
    <div class="progress-bar"><div class="progress-fill" id="progress" style="width:0%"></div></div>
    <div class="graph-container">
      <div class="graph-title">Agent Dependency Graph - Analysis Squadron</div>
      <svg id="dep-graph"></svg>
    </div>
    <div class="section">
      <div class="section-title">Agent Fleet</div>
      <div class="col-header"><span></span><span>Agent</span><span style="text-align:right">In</span><span style="text-align:right">Out</span><span style="text-align:right">Tools</span><span style="text-align:right">KB</span><span style="text-align:center">Status</span></div>
      <div id="agents"></div>
    </div>
    <div class="bottom-grid">
      <div class="section">
        <div class="section-title">Task List</div>
        <div class="task-list" id="tasks"></div>
      </div>
      <div class="section">
        <div class="section-title">Event Log</div>
        <div class="task-list" id="event-log" style="font-size:10px;max-height:180px;overflow-y:auto"></div>
      </div>
    </div>
  </div>
  <div class="right-panel" style="display:flex;flex-direction:column;">
    <div class="tab-bar">
      <div class="tab-btn active" data-tab="inspector" onclick="switchTab('inspector')">Inspector</div>
      <div class="tab-btn" data-tab="commands" onclick="switchTab('commands')">Commands</div>
      <div class="tab-btn" data-tab="todos" onclick="switchTab('todos')">TODOs</div>
    </div>
    <div class="tab-content active" id="tab-inspector" style="flex:1;overflow-y:auto;">
      <div id="inspector-content">
        <div class="no-selection">Click an agent or graph node to inspect</div>
      </div>
    </div>
    <div class="tab-content" id="tab-commands" style="flex:1;overflow-y:auto;">
      <div style="padding:10px 14px;">
        <div class="inspector-section" style="border:none;padding:0;">
          <h3>Slash Commands</h3>
          <div id="commands-list" style="background:#161b22;border:1px solid #30363d;border-radius:6px;overflow:hidden;margin-top:8px;"></div>
        </div>
      </div>
    </div>
    <div class="tab-content" id="tab-todos" style="flex:1;overflow-y:auto;">
      <div style="padding:10px 14px;">
        <div class="inspector-section" style="border:none;padding:0;">
          <h3>Active Tasks</h3>
          <div id="todos-active" style="margin-top:8px;"></div>
          <h3 style="margin-top:14px;">Completed</h3>
          <div id="todos-completed" style="margin-top:8px;"></div>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
let prevData = null;
let selectedAgent = null;
const eventLog = [];
let notifPermission = 'default';
let notifDropdownOpen = false;
function fmt(n) { return n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'K' : n.toString(); }
async function requestNotifPermission() { if ('Notification' in window) { notifPermission = await Notification.requestPermission(); } }
requestNotifPermission();
function sendBrowserNotif(title, body, tag) {
  if (notifPermission === 'granted' && document.hidden) {
    try { new Notification(title, { body, tag: tag || 'apm-' + Date.now(), silent: false }); } catch(e) {}
  }
}
function toggleNotifDropdown(e) { e.stopPropagation(); notifDropdownOpen = !notifDropdownOpen; document.getElementById('notif-dropdown').classList.toggle('open', notifDropdownOpen); }
function markAllRead(e) { e.stopPropagation(); fetch('/api/notifications/read-all',{method:'POST'}); document.querySelectorAll('.notif-item.unread').forEach(el=>el.classList.remove('unread')); document.getElementById('bell-badge').classList.add('hidden'); }
document.addEventListener('click', () => { notifDropdownOpen=false; document.getElementById('notif-dropdown').classList.remove('open'); });
function switchTab(tab) { document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active')); document.querySelector(`[data-tab="${tab}"]`).classList.add('active'); document.getElementById(`tab-${tab}`).classList.add('active'); }
function selectAgent(agentId) { selectedAgent=agentId; document.querySelectorAll('.agent-row').forEach(r=>r.classList.remove('selected')); const row=document.querySelector(`[data-agent="${agentId}"]`); if(row) row.classList.add('selected'); switchTab('inspector'); updateInspector(); highlightGraphNode(agentId); }
function updateInspector() {
  const el=document.getElementById('inspector-content');
  if(!prevData||!selectedAgent){el.innerHTML='<div class="no-selection">Click an agent or graph node to inspect</div>';return;}
  const agent=prevData.agents.find(a=>a.id===selectedAgent);
  if(!agent) return;
  const plane=agent.plane||{};
  const deps=agent.deps||[];
  const depAgents=deps.map(d=>prevData.agents.find(a=>a.id===d)).filter(Boolean);
  const downstream=prevData.agents.filter(a=>(a.deps||[]).includes(selectedAgent));
  const tc={1:'#58a6ff',2:'#bc8cff',3:'#f0883e'};
  let html=`<div class="inspector-section"><h3>Agent Details</h3>
    <div class="inspector-row"><span class="key">Name</span><span class="val">${agent.name}</span></div>
    <div class="inspector-row"><span class="key">ID</span><span class="val" style="color:#484f58">${agent.id}</span></div>
    <div class="inspector-row"><span class="key">Tier</span><span class="val" style="color:${tc[agent.tier]}">${agent.tier}</span></div>
    <div class="inspector-row"><span class="key">Status</span><span class="val"><span class="status ${agent.status}">${agent.status}</span></span></div>
    <div class="inspector-row"><span class="key">Tokens In</span><span class="val">${fmt(agent.tokens_in)}</span></div>
    <div class="inspector-row"><span class="key">Tokens Out</span><span class="val">${fmt(agent.tokens_out)}</span></div>
    <div class="inspector-row"><span class="key">Cache</span><span class="val">${fmt(agent.tokens_cache)}</span></div>
    <div class="inspector-row"><span class="key">Tools</span><span class="val">${agent.tools_used}</span></div>
    <div class="inspector-row"><span class="key">API Calls</span><span class="val">${agent.api_calls}</span></div>
    <div class="inspector-row"><span class="key">Output</span><span class="val">${agent.file_size_kb} KB</span></div>
  </div>
  <div class="inspector-section"><h3>Context</h3>
    ${Object.entries(plane).map(([k,v])=>`<div class="inspector-row"><span class="key">${k}</span><span class="val">${v}</span></div>`).join('')}
  </div>
  <div class="inspector-section"><h3>Dependencies (${deps.length} up, ${downstream.length} down)</h3>
    ${depAgents.map(d=>`<div class="inspector-row" style="cursor:pointer" onclick="selectAgent('${d.id}')"><span class="key" style="color:${tc[d.tier]}">[T${d.tier}] ${d.name}</span><span class="val"><span class="status ${d.status}">${d.status}</span></span></div>`).join('')}
    ${downstream.map(d=>`<div class="inspector-row" style="cursor:pointer" onclick="selectAgent('${d.id}')"><span class="key" style="color:${tc[d.tier]}">-> ${d.name}</span><span class="val"><span class="status ${d.status}">${d.status}</span></span></div>`).join('')}
  </div>
  <div class="inspector-section"><h3>Dep Subgraph</h3><svg id="inspector-dep-graph" height="140"></svg></div>`;
  if(agent.last_message){html+=`<div class="inspector-section"><h3>Last Output</h3><div style="color:#8b949e;font-size:9px;word-break:break-all;max-height:80px;overflow:hidden">${agent.last_message.replace(/</g,'&lt;')}</div></div>`;}
  el.innerHTML=html;
  drawMiniGraph(selectedAgent);
}
function drawMiniGraph(agentId) {
  if(!prevData) return;
  const svg=d3.select('#inspector-dep-graph');svg.selectAll('*').remove();
  const w=346,h=140;svg.attr('viewBox',`0 0 ${w} ${h}`);
  const agent=prevData.agents.find(a=>a.id===agentId);if(!agent)return;
  const relIds=new Set([agentId,...(agent.deps||[])]);
  prevData.agents.filter(a=>(a.deps||[]).includes(agentId)).forEach(a=>relIds.add(a.id));
  const nodes=prevData.agents.filter(a=>relIds.has(a.id)).map(a=>({...a}));
  const edges=prevData.edges.filter(e=>relIds.has(e.source)&&relIds.has(e.target));
  const tc={1:'#1f6feb',2:'#8957e5',3:'#f0883e'};
  const sf={completed:'#23863566',running:'#9e6a0366',pending:'#484f5866'};
  const tg={};nodes.forEach(n=>{if(!tg[n.tier])tg[n.tier]=[];tg[n.tier].push(n);});
  const ts=Object.keys(tg).sort();const xS=w/(ts.length+1);
  ts.forEach((t,i)=>{const g=tg[t];const yS=h/(g.length+1);g.forEach((n,j)=>{n.x=xS*(i+1);n.y=yS*(j+1);});});
  const nm={};nodes.forEach(n=>nm[n.id]=n);
  svg.selectAll('.ml').data(edges).enter().append('line').attr('x1',d=>(nm[d.source]||{}).x||0).attr('y1',d=>(nm[d.source]||{}).y||0).attr('x2',d=>(nm[d.target]||{}).x||0).attr('y2',d=>(nm[d.target]||{}).y||0).attr('stroke','#30363d').attr('stroke-width',1.5);
  const g=svg.selectAll('.mn').data(nodes).enter().append('g').attr('transform',d=>`translate(${d.x},${d.y})`);
  g.append('circle').attr('r',d=>d.id===agentId?12:9).attr('fill',d=>sf[d.status]||'#484f5866').attr('stroke',d=>d.id===agentId?'#58a6ff':tc[d.tier]).attr('stroke-width',d=>d.id===agentId?2.5:1.5);
  g.append('text').text(d=>'T'+d.tier).attr('text-anchor','middle').attr('dy',3).attr('fill','#c9d1d9').attr('font-size',8);
}
function drawGraph(data) {
  const svg=d3.select('#dep-graph');const container=svg.node().parentElement;const w=container.clientWidth;const h=200;
  svg.attr('viewBox',`0 0 ${w} ${h}`).attr('height',h);svg.selectAll('*').remove();
  const tc={1:'#1f6feb',2:'#8957e5',3:'#f0883e'};const sf={completed:'#23863566',running:'#9e6a0366',pending:'#484f5866'};
  const nodes=data.agents.map(a=>({...a}));const edges=data.edges;
  const tg={};nodes.forEach(n=>{if(!tg[n.tier])tg[n.tier]=[];tg[n.tier].push(n);});
  const ts=Object.keys(tg).sort();const xS=w/(ts.length+1);
  ts.forEach((t,i)=>{const g=tg[t];const yS=h/(g.length+1);g.forEach((n,j)=>{n.x=xS*(i+1);n.y=yS*(j+1);});});
  const nm={};nodes.forEach(n=>nm[n.id]=n);
  ts.forEach((t,i)=>{svg.append('rect').attr('x',xS*(i+0.5)).attr('y',0).attr('width',xS).attr('height',h).attr('fill',tc[t]+'08').attr('rx',6);svg.append('text').text(`TIER ${t}`).attr('class','tier-label').attr('x',xS*(i+1)).attr('y',h-4).attr('text-anchor','middle');});
  svg.append('defs').append('marker').attr('id','arrow').attr('viewBox','0 0 10 10').attr('refX',22).attr('refY',5).attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto').append('path').attr('d','M 0 0 L 10 5 L 0 10 z').attr('fill','#30363d');
  edges.forEach(e=>{const s=nm[e.source],t=nm[e.target];if(!s||!t)return;const mx=(s.x+t.x)/2;svg.append('path').attr('class','link').attr('d',`M${s.x},${s.y} C${mx},${s.y} ${mx},${t.y} ${t.x},${t.y}`).attr('stroke','#30363d').attr('stroke-width',1.5).attr('marker-end','url(#arrow)');});
  const g=svg.selectAll('.node').data(nodes).enter().append('g').attr('class','node').attr('transform',d=>`translate(${d.x},${d.y})`).style('cursor','pointer').on('click',(ev,d)=>selectAgent(d.id));
  g.append('circle').attr('r',d=>d.id===selectedAgent?15:12).attr('fill',d=>sf[d.status]||'#484f5866').attr('stroke',d=>d.id===selectedAgent?'#58a6ff':tc[d.tier]).attr('stroke-width',d=>d.id===selectedAgent?3:2);
  g.filter(d=>d.status==='running').append('circle').attr('r',16).attr('fill','none').attr('stroke','#d2992244').attr('stroke-width',1.5).attr('stroke-dasharray','4 4').style('animation','spin 3s linear infinite');
  g.append('text').text(d=>d.name.length>16?d.name.substring(0,14)+'..':d.name).attr('text-anchor','middle').attr('dy',-16).attr('font-size',8);
  g.append('text').text(d=>d.status==='completed'?'OK':d.status==='running'?'RUN':'--').attr('text-anchor','middle').attr('dy',4).attr('font-size',8).attr('fill',d=>d.status==='completed'?'#3fb950':d.status==='running'?'#d29922':'#8b949e');
}
function highlightGraphNode(id){d3.selectAll('.node circle').attr('stroke-width',d=>d.id===id?3:2).attr('stroke',d=>d.id===id?'#58a6ff':{1:'#1f6feb',2:'#8957e5',3:'#f0883e'}[d.tier]).attr('r',d=>d.id===id?15:12);}
function updateCommands(data){const el=document.getElementById('commands-list');const cmds=data.slash_commands||[];const cats={};cmds.forEach(c=>{if(!cats[c.category])cats[c.category]=[];cats[c.category].push(c);});let html='';for(const[cat,items]of Object.entries(cats)){html+=`<div style="padding:4px 12px;background:#0d1117;font-size:8px;color:#484f58;text-transform:uppercase;letter-spacing:1px;">${cat}</div>`;html+=items.map(c=>`<div class="cmd-item"><span class="cmd-name">/${c.name}</span><span class="cmd-desc">${c.description}</span><span class="cmd-status ${c.status}">${c.status}</span></div>`).join('');}el.innerHTML=html;}
function updateTodos(data){const active=(data.tasks||[]).filter(t=>t.status!=='completed');const done=(data.tasks||[]).filter(t=>t.status==='completed');document.getElementById('todos-active').innerHTML=active.length?active.map(t=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #21262d;font-size:10px;"><span style="color:#484f58">#${t.id}</span><span style="flex:1;margin:0 8px;color:#e6edf3">${t.subject}</span><span class="status ${t.status}">${t.status.replace('_',' ')}</span></div>`).join(''):'<div style="color:#484f58;font-size:10px;">No active tasks</div>';document.getElementById('todos-completed').innerHTML=done.slice(0,15).map(t=>`<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #21262d;font-size:10px;"><span style="color:#484f58">#${t.id}</span><span style="flex:1;margin:0 8px;color:#8b949e">${t.subject}</span><span class="status completed">done</span></div>`).join('');}
function updateNotifications(data){const notifs=data.notifications||{};const badge=document.getElementById('bell-badge');if(notifs.unread>0){badge.textContent=notifs.unread;badge.classList.remove('hidden');}else{badge.classList.add('hidden');}const list=document.getElementById('notif-list');const recent=notifs.recent||[];list.innerHTML=recent.length?recent.map(n=>{const t=new Date(n.timestamp).toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit'});return`<div class="notif-item ${n.read?'':'unread'}"><div class="notif-title"><span class="notif-cat ${n.category}">${n.category}</span>${n.title}</div><div class="notif-body">${n.body}</div><div class="notif-time">${t}</div></div>`;}).join(''):'<div style="padding:20px;color:#484f58;text-align:center;font-size:11px;">No notifications</div>';}
function addEvent(msg,type){const t=new Date().toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});eventLog.unshift({time:t,msg,type});if(eventLog.length>50)eventLog.pop();}
let prevNotifIds=new Set();
async function refresh(){try{const res=await fetch('/api/data');const data=await res.json();
  document.getElementById('project').textContent=data.project;
  document.getElementById('s-agents').textContent=data.summary.total_agents;
  document.getElementById('s-completed').textContent=data.summary.completed;
  document.getElementById('s-running').textContent=data.summary.running;
  document.getElementById('s-tokens-in').textContent=fmt(data.summary.total_tokens_in);
  document.getElementById('s-tools').textContent=data.summary.total_tool_calls;
  document.getElementById('s-api').textContent=data.summary.total_api_calls;
  const total=data.summary.total_agents||1;
  document.getElementById('progress').style.width=Math.round((data.summary.completed/total)*100)+'%';
  if(prevData){data.agents.forEach(a=>{const p=prevData.agents.find(x=>x.id===a.id);if(p&&p.status!==a.status&&a.status==='completed'){addEvent(`Agent "${a.name}" completed`,'success');sendBrowserNotif('Agent Completed',`"${a.name}" has finished execution`,'agent-'+a.id);}if(p&&a.tools_used>p.tools_used){addEvent(`${a.name}: +${a.tools_used-p.tools_used} tools`,'info');}});}
  const newNotifs=(data.notifications.recent||[]).filter(n=>!prevNotifIds.has(n.id));
  newNotifs.forEach(n=>{prevNotifIds.add(n.id);if(n.category!=='system')sendBrowserNotif(n.title,n.body,'notif-'+n.id);});
  prevData=data;drawGraph(data);
  document.getElementById('agents').innerHTML=data.agents.map(a=>`<div class="agent-row ${a.id===selectedAgent?'selected':''}" data-agent="${a.id}" onclick="selectAgent('${a.id}')"><div class="tier-badge tier-${a.tier}">T${a.tier}</div><div class="agent-name">${a.name} <span class="id">${a.id}</span></div><div class="metric"><span class="val">${fmt(a.tokens_in)}</span> <span class="unit">in</span></div><div class="metric"><span class="val">${fmt(a.tokens_out)}</span> <span class="unit">out</span></div><div class="metric"><span class="val">${a.tools_used}</span></div><div class="metric"><span class="val">${a.file_size_kb}</span></div><div><span class="status ${a.status}">${a.status}</span></div></div>`).join('');
  document.getElementById('tasks').innerHTML=(data.tasks||[]).map(t=>`<div class="task-row"><span class="task-id">#${t.id}</span><span>${t.subject}</span><span><span class="status ${t.status}">${t.status.replace('_',' ')}</span></span></div>`).join('');
  document.getElementById('event-log').innerHTML=eventLog.map(e=>`<div style="padding:3px 8px;border-bottom:1px solid #21262d;"><span style="color:#484f58;margin-right:6px;">${e.time}</span><span style="color:${e.type==='success'?'#3fb950':'#c9d1d9'}">${e.msg}</span></div>`).join('');
  updateNotifications(data);updateCommands(data);updateTodos(data);if(selectedAgent)updateInspector();
  const ind=document.getElementById('refresh-indicator');ind.style.color='#58a6ff';setTimeout(()=>ind.style.color='#3fb950',200);
}catch(e){console.error('Refresh:',e);}}
function updateClock(){document.getElementById('clock').textContent=new Date().toLocaleTimeString('en-US',{hour12:false});}
setInterval(refresh,2000);setInterval(updateClock,1000);refresh();updateClock();addEvent('APM v3 initialized','system');
</script>
</body>
</html>"""


class MonitorHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/data":
            self._json_response(get_api_data())
        elif self.path == "/api/notifications":
            self._json_response({"notifications": _notifications[:50]})
        elif self.path == "/api/commands":
            self._json_response({"commands": SLASH_COMMANDS})
        elif self.path == "/" or self.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(DASHBOARD_HTML.encode())
        elif self.path == "/api/register":
            self._json_response({"agents": list(AGENTS.keys())})
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/api/notifications/read-all":
            with _notification_lock:
                for n in _notifications:
                    n["read"] = True
            self._json_response({"ok": True})
        elif self.path == "/api/notifications/add":
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            nid = add_notification(
                body.get("title", "Notification"),
                body.get("body", ""),
                body.get("category", "info"),
                body.get("agent_id"),
            )
            self._json_response({"ok": True, "id": nid})
        elif self.path == "/api/agent/register":
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            register_agent(
                body["id"], body["name"], body["tier"],
                body.get("deps", []), body.get("context", {})
            )
            self._json_response({"ok": True})
        elif self.path == "/api/agent/complete":
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            aid = body.get("id")
            with AGENTS_LOCK:
                if aid in AGENTS:
                    AGENTS[aid]["status"] = "completed"
            add_notification("Agent Completed", f'Agent {aid} finished', category="success", agent_id=aid)
            self._json_response({"ok": True})
        elif self.path == "/api/task/add":
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            TASKS.append(body)
            self._json_response({"ok": True})
        else:
            self.send_response(404)
            self.end_headers()

    def _json_response(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    server = http.server.HTTPServer(("0.0.0.0", PORT), MonitorHandler)
    print(f"APM v3 - Sound Forge Alchemy running at http://localhost:{PORT}")
    server.serve_forever()
