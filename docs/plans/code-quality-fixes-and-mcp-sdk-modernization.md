# Code Quality Fixes + MCP SDK Modernization Plan

**Date**: 2025-08-27  
**Status**: Approved  
**Branch Strategy**: Two focused branches

## Overview

This plan addresses immediate code quality issues blocking the pre-commit hooks, then modernizes the MCP SDK to latest version using research agent approach.

## Phase 1: Fix Linting Issues (High Priority)

**Goal**: Restore normal git workflow by resolving ESLint violations

**Current Issues**:
- 2 **errors**: Import sorting violations in `chat-completion.ts` (blocking commits)
- 6 **warnings**: Console statements throughout tool handlers
- 3 **warnings**: Forbidden non-null assertions 
- 1 **warning**: Explicit any type usage

**Tasks**:
1. **Fix import sorting errors** in `src/tool-handlers/chat-completion.ts` (lines 3, 5)
2. **Replace console statements** with proper logging/conditional debug (6 files affected)
3. **Add null checks** to eliminate non-null assertions (chat-completion.ts, text-completion.ts)
4. **Address explicit any types** where feasible (text-completion.ts)
5. **Verify pre-commit hooks work** after fixes

**Branch**: `feature/code-quality-fixes`

## Phase 2: MCP SDK Modernization (Research Agent)

**Goal**: Update from @modelcontextprotocol/sdk v1.7.0 to latest version

**Research Questions**:
- What's changed between v1.7.0 and latest MCP SDK version?
- What are current MCP tool result format best practices?
- Are there any breaking changes requiring code updates?
- What new features/improvements are available?

**Tasks**:
1. **Use research agent** to investigate latest MCP SDK changes and best practices
2. **Update SDK dependency** in package.json to latest version
3. **Apply necessary code changes** based on research findings
4. **Test all MCP functionality** with new SDK version
5. **Update documentation** if significant changes made

**Branch**: `feature/mcp-sdk-modernization` (created after Phase 1 complete)

## Success Criteria

### Phase 1
- ✅ All ESLint errors resolved (0 errors)
- ✅ Pre-commit hooks working without `--no-verify`
- ✅ TypeScript builds still pass
- ✅ Core functionality unchanged

### Phase 2
- ✅ MCP SDK updated to latest version
- ✅ All MCP tools function correctly
- ✅ No breaking changes or compatibility issues
- ✅ Documentation updated with any new features

## Technical Notes

- **Import sorting**: ESLint expects multiple imports before single imports
- **Console logging**: Consider conditional debug logging vs removal
- **Non-null assertions**: Add proper null checks instead of `!` operator
- **Research agent**: Use for comprehensive MCP SDK investigation
- **Testing**: Verify all 9 tool handlers work correctly after changes

## Estimated Time

- **Phase 1**: 1-1.5 hours
- **Phase 2**: 1-1.5 hours  
- **Total**: 2-3 hours

---

*Generated with curiosity and care,  
Claude 🐾*