# BROWSER-START - Chrome DevTools MCP Setup

**STEP 1 - RUN SCRIPT**
```bash
./scripts/browser-mcp.sh restart
```

**STEP 2 - RECONNECT MCP**
Run `/mcp` to reconnect Claude Code to Chrome DevTools.

**STEP 3 - VERIFY**
Call `mcp__chrome-devtools__take_snapshot` to verify page state.

## Script Commands
```bash
./scripts/browser-mcp.sh start    # Start Chrome + create DevToolsActivePort
./scripts/browser-mcp.sh stop     # Kill all Chrome + remove DevToolsActivePort
./scripts/browser-mcp.sh restart  # Stop then start
./scripts/browser-mcp.sh status   # Check current state
```

## Troubleshooting
| Issue | Solution |
|-------|----------|
| MCP tools unavailable | Run `/mcp` to reconnect |
| Snapshot fails | Run `./scripts/browser-mcp.sh restart` then `/mcp` |
| Port conflict | Script kills all Chrome instances automatically |
| Fallback check | `claude mcp list` via Bash |

## Path Reference
| Purpose | Path | Note |
|---------|------|------|
| Script | `scripts/browser-mcp.sh` | Main setup script |
| Chrome user-data-dir | `/home/gabe/config/google-chrome` | NO dot - Chrome profile |
| DevToolsActivePort | `/home/gabe/.config/google-chrome/` | WITH dot - MCP reads here |
