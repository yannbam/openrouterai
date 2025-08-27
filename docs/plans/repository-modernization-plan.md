# Repository Modernization Plan

**Date**: 2025-08-27  
**Status**: Approved  
**Branch**: feature/add-reasoning-support  

## Overview

This plan transforms the OpenRouter MCP Server repository into a modern, maintainable, and professional TypeScript project with up-to-date dependencies, comprehensive testing, excellent debugging capabilities, and consistent code quality.

## Phase 1: Git Repository Structure & Standards

### 1. Branch Management
- Rename `master` branch to `main` 
- Update default branch on origin remote
- Update any branch references in documentation

### 2. Git Hooks Setup
- Install and configure **husky** for git hook management
- Add **lint-staged** for running linters on staged files only
- Configure pre-commit hooks for:
  - ESLint with auto-fix
  - Prettier formatting
  - TypeScript type checking
  - Basic test validation

## Phase 2: Upstream Integration & Dependencies

### 3. Upstream Analysis & Feature Integration
- Review the 3 upstream commits for useful features:
  - Version bump changes
  - **OpenRouter slug suffixes support** (:floor for cheapest provider, :online for web search access)
  - **Unified error handling** with structured error messages as tool results
- Cherry-pick or manually implement the valuable upstream improvements
- Ensure compatibility with our current feature set

### 4. MCP SDK Update & Best Practices
- Update `@modelcontextprotocol/sdk` to latest version
- **Research current MCP tool result format best practices**
- Check for breaking changes and update code accordingly
- Implement modern tool result formatting patterns
- Verify all MCP functionality works with new version

### 5. General Dependency Audit
- Update all dependencies to latest stable versions
- Check for security vulnerabilities (`npm audit`)
- Remove any unused dependencies

## Phase 3: Error Handling & Tool Result Modernization

### 6. Unified Error Handling Implementation
- Study upstream unified error handler commit for inspiration
- Implement consistent error handling across all tool handlers
- Create structured error message format for tool results
- Ensure errors include proper context and actionable information
- Add error recovery mechanisms where appropriate

### 7. Tool Result Format Standardization
- Implement current MCP best practices for tool result formatting
- Ensure consistent response structures across all tools
- Add proper error vs success result differentiation
- Include relevant metadata in tool results

## Phase 4: Code Quality & Linting

### 8. ESLint Configuration
- Install ESLint with TypeScript parser
- Configure strict rules suitable for Node.js/MCP server
- Add rules for: unused variables, consistent imports, async best practices
- Create `.eslintrc.json` with appropriate extends and rules

### 9. Prettier Configuration
- Install Prettier with sensible defaults
- Create `.prettierrc` for consistent formatting
- Configure integration with ESLint (eslint-config-prettier)

## Phase 5: Code Review, Cleanup & Refactoring

### 10. Comprehensive Code Review
- Review all source files for code quality issues
- Check for proper error handling patterns
- Identify code duplication and refactoring opportunities
- Ensure consistent coding patterns across the codebase

### 11. Debug Message Improvements
- Add comprehensive logging throughout the application
- Implement structured logging with different log levels
- Add context-rich error messages for better debugging
- Ensure all API errors include relevant request/response details
- Add debug logs for rate limiting, caching, and retry logic

### 12. OpenRouter Feature Enhancements
- Implement **slug suffix support** (:floor, :online) from upstream
- Add comprehensive tests for new slug suffix functionality
- Update documentation to reflect new capabilities
- Ensure backward compatibility with existing model references

### 13. Refactoring & Cleanup
- Extract common patterns into utility functions
- Improve type definitions and interfaces
- Optimize imports and remove unused code
- Ensure consistent naming conventions

## Phase 6: Comprehensive Testing Infrastructure  

### 14. Modern Test Framework
- Replace custom test runner with **Vitest** (fast, TypeScript native)
- Convert existing `conversation-manager.test.ts` to Vitest
- Add proper test utilities and matchers

### 15. Complete Test Suite
- **Unit Tests**: All tool handlers, conversation manager, model cache, API client
- **Integration Tests**: Full MCP server workflow tests
- **Error Handling Tests**: Rate limiting, network failures, invalid inputs, structured error responses
- **New Feature Tests**: OpenRouter slug suffix functionality
- **Mock Setup**: Mock OpenRouter API responses for reliable testing
- Target **80%+ code coverage**

## Phase 7: Development Experience Improvements

### 16. Enhanced Package Scripts
- Add `test`, `test:watch`, `test:coverage`, `lint`, `lint:fix`, `format` scripts
- Add `dev` script with watch mode for development
- Add `typecheck` script for standalone type checking

### 17. VS Code Configuration
- Add `.vscode/settings.json` with ESLint/Prettier integration
- Add `.vscode/extensions.json` with recommended extensions
- Configure auto-format on save and organize imports

## Phase 8: Documentation & Project Organization

### 18. Create `docs/` Directory Structure
- `docs/HANDOFF.md` - Inter-session handoff documentation
- `docs/TASKS.md` - Task tracking and project todos  
- `docs/BUGS.md` - Known issues and bug tracking
- `docs/ARCHITECTURE.md` - Technical architecture documentation
- `docs/TESTING.md` - Testing guidelines and examples

### 19. Enhanced README
- Add documentation for new OpenRouter slug suffix features
- Add badges for test status, coverage, code quality
- Add development setup section
- Add contribution guidelines reference

## Phase 9: Optional Advanced Features

### 20. Continuous Integration Setup
- Create GitHub Actions workflow for:
  - Automated testing on PR/push
  - Code coverage reporting  
  - Automated releases with semantic versioning

### 21. Additional Quality Tools
- Add **TypeScript strict mode validation**
- Consider **dependency vulnerability scanning**
- Add **commit message linting** (conventional commits)

## Implementation Priority

- **High Priority**: Phases 1-6 (Git, upstream features, dependencies, linting, code review, testing) - Core infrastructure and feature parity
- **Medium Priority**: Phases 7-8 (DX improvements, docs) - Developer experience  
- **Optional**: Phase 9 (CI/CD, advanced tooling) - Based on project needs

## Success Criteria

This plan will bring the repository up to date with upstream improvements, implement modern MCP best practices, add valuable OpenRouter features like slug suffixes, and transform it into a professional TypeScript project with comprehensive testing and excellent debugging capabilities.

---

*Generated with curiosity and care,  
Claude 🐾*