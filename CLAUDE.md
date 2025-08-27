# OpenRouter MCP Server - Workflow Instructions

## 🔄 CONTEXT MANAGEMENT CYCLE

This project uses a **focused branch cycle** to prevent context bloat and maintain clean git history:

### **1. FOCUSED WORK**
- **One branch per major feature/phase** (e.g., `feature/mcp-sdk-modernization`)
- **Complete logical units** before moving to next phase
- **Atomic commits** with descriptive messages

### **2. DOCUMENTATION**
- **Update `docs/TODO.md`** - Current progress and next steps
- **Update `docs/HANDOFF.md`** - Complete handoff for next Claude instance
- **Both files must be self-contained** and comprehensive

### **3. MERGE & COMPACT**
- **Merge to main** when phase is complete and working
- **End session** to clear context (context compact)
- **Next Claude instance** starts fresh with new branch

### **4. NEXT PHASE**
- **Read handoff docs first** (`docs/HANDOFF.md`, `docs/TODO.md`)
- **Create new branch** for next focused task
- **Repeat cycle**

## 📋 CURRENT PRIORITIES

1. **Fix linting issues** blocking pre-commit hooks
2. **MCP SDK modernization** (use research agent)
3. **Complete ToolResult conversion** for remaining 8 tool handlers
4. **Modern testing** with Vitest replacement

## ⚙️ PROJECT SPECIFICS

- **Pre-commit hooks** auto-format code (when linting passes)
- **TypeScript builds** must pass before merging
- **Research agent** requested for MCP SDK investigation
- **Comprehensive documentation** required for all phases

---

**Philosophy**: Work in focused sprints, document thoroughly, hand off cleanly.

*This workflow prevents context bloat and ensures each Claude instance can continue effectively.*