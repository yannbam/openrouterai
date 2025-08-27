# OpenRouter MCP Server - Workflow Instructions

## 🚀 SESSION ONBOARDING

**MANDATORY FIRST STEPS:**

1. **Read handoff documentation:**
   - `docs/HANDOFF.md` - Previous session results and technical details
   - `docs/TODO.md` - Current progress and prioritized next tasks

2. **Choose focused task scope:**
   - Select 1-2 related tasks from TODO/HANDOFF documentation
   - Focus on logical completion units (don't fragment arbitrarily)
   - Consider complexity and time investment

3. **Present task scope for approval:**
   - Use `ExitPlanMode` tool to present chosen task scope to human
   - Wait for explicit approval before starting work
   - Refine scope based on human feedback if needed

## 🔄 WORK CYCLE

### **DURING WORK**
- **Create focused branch** for your task scope (e.g., `feature/mcp-sdk-modernization`)
- **Atomic commits** with descriptive messages throughout work
- **Test functionality** - TypeScript builds must pass before completion
- **Update documentation** as you progress (especially for complex changes)

### **END OF CYCLE**

**MANDATORY END SEQUENCE:**

1. **Update documentation:**
   - Update `docs/TODO.md` with completed tasks and new priorities
   - Update `docs/HANDOFF.md` with comprehensive session results

2. **Request end-of-cycle approval:**
   - Use `AskHuman` tool to request approval for ending current session
   - Present summary of accomplished work and current state
   - Wait for explicit approval

3. **After human approval:**
   - Run `ghprm` command - Pushes current branch and creates PR
   - Wait for command success confirmation
   - Run `pcm` command - Switches to main and pulls merge
   - Wait for command success confirmation

4. **Final handoff:**
   - Use `AskHuman` tool to inform human to use `/compact` command
   - This ends the current session for context cleanup

## 📋 CURRENT PROJECT STATUS

**Next Prioritized Tasks:**
1. **Fix linting issues** blocking pre-commit hooks (import sorting, console logs)
2. **MCP SDK modernization** (use research agent to investigate latest version)
3. **Complete ToolResult conversion** for remaining 8 tool handlers
4. **Modern testing setup** with Vitest replacement

## ⚙️ PROJECT SPECIFICS

- **Pre-commit hooks** auto-format code (when linting violations are fixed)
- **TypeScript builds** must pass before any completion claims
- **Research agent** specifically requested for MCP SDK investigation
- **No --no-verify commits** in normal workflow (fix linting instead)

## 🎯 SUCCESS CRITERIA

- **One focused improvement per session**
- **Clean git history** with atomic commits
- **Comprehensive handoff documentation** 
- **Working functionality** before session end
- **Smooth transition** to next Claude instance

---

**Philosophy**: Focused sprints → comprehensive documentation → clean handoff → context compact.

*This workflow ensures each Claude instance can continue effectively with minimal context overhead.*