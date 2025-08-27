// Basic test for reasoning support functionality
import { ChatCompletionToolRequest } from './tool-handlers/chat-completion.js';

// Helper for simple assertions
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('Running Reasoning Support Tests...');

// Test Suite for Reasoning Parameter Support
(async () => {
  // 1. Test Interface Type Checking
  const testRequest: ChatCompletionToolRequest = {
    model: "test-model",
    messages: [{role: "user", content: "Hello"}],
    reasoning: "high"
  };
  
  assert(testRequest.reasoning === "high", 'Reasoning parameter should be assignable');
  console.log('✓ Interface Type Test Passed');

  // 2. Test Default Reasoning Logic (simulate tool handler logic)
  function applyDefaultReasoning(reasoning?: "none" | "low" | "medium" | "high"): "none" | "low" | "medium" | "high" {
    return reasoning || "medium";
  }

  assert(applyDefaultReasoning() === "medium", 'Should default to medium when undefined');
  assert(applyDefaultReasoning("high") === "high", 'Should preserve explicit high value');
  assert(applyDefaultReasoning("low") === "low", 'Should preserve explicit low value');
  assert(applyDefaultReasoning("none") === "none", 'Should preserve explicit none value');
  console.log('✓ Default Reasoning Logic Test Passed');

  // 3. Test Reasoning Object Construction (simulate API client logic)
  function constructReasoningObject(reasoning: "none" | "low" | "medium" | "high") {
    if (reasoning === "none") {
      return undefined; // Don't send reasoning parameter
    }
    return {
      effort: reasoning,
      exclude: true
    };
  }

  const noneResult = constructReasoningObject("none");
  assert(noneResult === undefined, 'Should return undefined for "none" reasoning');

  const lowResult = constructReasoningObject("low");
  assert(lowResult !== undefined && lowResult.effort === "low" && lowResult.exclude === true, 
         'Should construct proper object for low reasoning');

  const mediumResult = constructReasoningObject("medium");
  assert(mediumResult !== undefined && mediumResult.effort === "medium" && mediumResult.exclude === true, 
         'Should construct proper object for medium reasoning');

  const highResult = constructReasoningObject("high");
  assert(highResult !== undefined && highResult.effort === "high" && highResult.exclude === true, 
         'Should construct proper object for high reasoning');

  console.log('✓ Reasoning Object Construction Test Passed');

  // 4. Test Request Body Structure (simulate full request)
  function simulateAPIRequest(params: {
    model: string,
    messages: any[],
    reasoning?: "none" | "low" | "medium" | "high"
  }) {
    const requestBody: any = {
      model: params.model,
      messages: params.messages,
      transforms: []
    };

    const reasoning = params.reasoning || "medium";
    if (reasoning !== "none") {
      requestBody.reasoning = {
        effort: reasoning,
        exclude: true
      };
    }

    return requestBody;
  }

  const requestWithNone = simulateAPIRequest({
    model: "test-model",
    messages: [{role: "user", content: "Test"}],
    reasoning: "none"
  });
  assert(requestWithNone.reasoning === undefined, 'Request with "none" should not include reasoning object');

  const requestWithDefault = simulateAPIRequest({
    model: "test-model", 
    messages: [{role: "user", content: "Test"}]
    // No reasoning parameter - should default to medium
  });
  assert(requestWithDefault.reasoning !== undefined && requestWithDefault.reasoning.effort === "medium", 
         'Request without reasoning should default to medium');

  const requestWithHigh = simulateAPIRequest({
    model: "test-model",
    messages: [{role: "user", content: "Test"}],
    reasoning: "high"
  });
  assert(requestWithHigh.reasoning !== undefined && requestWithHigh.reasoning.effort === "high" && requestWithHigh.reasoning.exclude === true,
         'Request with high reasoning should include proper reasoning object');

  console.log('✓ Full Request Simulation Test Passed');

  console.log('All Reasoning Support Tests Passed! ✅');
})().catch(e => {
  console.error('Reasoning test failed:', e);
  process.exit(1);
});