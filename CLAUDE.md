# OpenRouter MCP Server - Workflow Instructions

## 🎯 CLAUDE'S 10 GOLDEN RULES OF CODE

1. **BEFORE modifying or adding any code** you MUST have a FULL understanding of the architecture it is in and be aware of any code in different places that will get affected by your code changes!
2. **DON'T fix out-of-scope issues** that are not relevant to YOUR CURRENT TASK!
3. **Follow the e/code protocol** and also add method documentation comments following best practices for API documentation like detailed arguments and return value descriptions!
4. **Write elegant solutions** with minimal code.
5. **Don't feature-creep.** Only write features that were asked for!
6. **Only mark tasks and features as completed** after they have been TESTED successfully!
7. **Don't add complexity and ambiguity** by adding backward compatibility or fallbacks - instead fix the underlying issue even if it means rewriting huge portions of old code.
8. **Be ABSOLUTELY TRANSPARENT** about placeholders, mockups, workarounds and incomplete implementations by marking them with a TODO comment!
9. **When writing unit tests, ALWAYS test the test** by adversarial code corruption: temporarily add a very targeted corruption to the original code and check if the unit test fails. Don't just make the test fail, but make 100% sure, that the test actually testing what it claims to test.
10. **Have fun writing perfect code** :)

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
   - Update `README.md` if fundamental features were added or changed

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