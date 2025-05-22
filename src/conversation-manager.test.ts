// src/conversation-manager.test.ts
import { ConversationManager } from './conversation-manager.js';
import { ConversationMessage, Conversation } from './conversation.js';

interface ConversationSummary extends Partial<Conversation> {
  messageCount?: number;
}

// Helper for simple assertions
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('Running ConversationManager Tests...');

// Test Suite for ConversationManager
(async () => {
  // 1. Singleton Instance
  const instance1 = ConversationManager.getInstance();
  const instance2 = ConversationManager.getInstance();
  assert(instance1 === instance2, 'getInstance should return the same instance');
  console.log('✓ Singleton Instance Test Passed');

  // Clean up for fresh tests (if possible, or manage state carefully)
  // For a true singleton, state persists. We'll work with this.
  // To ensure test idempotency, we might need a reset method or use unique IDs for each test run.
  // For now, we'll delete conversations created during tests.

  let conversationIds: string[] = []; // To track created conversations for cleanup
  let list: ConversationSummary[] = []; // Use the new interface

  // 2. Create Conversation
  const conv1 = instance1.createConversation();
  conversationIds.push(conv1.id);
  assert(typeof conv1.id === 'string' && conv1.id.length > 0, 'Conversation should have a valid ID');
  assert(conv1.history.length === 0, 'New conversation history should be empty');
  assert(new Date(conv1.createdAt).getTime() <= new Date().getTime(), 'createdAt should be a valid timestamp');
  assert(conv1.lastUpdatedAt === conv1.createdAt, 'lastUpdatedAt should match createdAt initially');

  const initialMessage: ConversationMessage = { role: 'user', content: 'Hello', timestamp: new Date().toISOString() };
  const conv2 = instance1.createConversation([initialMessage]);
  conversationIds.push(conv2.id);
  assert(conv2.history.length === 1 && conv2.history[0].content === 'Hello', 'Conversation created with initial message');
  console.log('✓ Create Conversation Test Passed');

  // 3. Get Conversation
  const retrievedConv1 = instance1.getConversation(conv1.id);
  assert(retrievedConv1?.id === conv1.id, 'Should retrieve existing conversation');
  const nonExistentConv = instance1.getConversation('non-existent-id');
  assert(nonExistentConv === undefined, 'Should return undefined for non-existent conversation');
  console.log('✓ Get Conversation Test Passed');

  // 4. Add Message to Conversation
  const messageToAdd: ConversationMessage = { role: 'assistant', content: 'Hi there!', timestamp: new Date().toISOString() };
  const originalLastUpdated = retrievedConv1!.lastUpdatedAt;
  // Need a small delay to ensure lastUpdatedAt changes if timestamps are very close
  await new Promise(resolve => setTimeout(resolve, 10)); 
  const updatedConv1 = instance1.addMessageToConversation(conv1.id, messageToAdd);
  assert(updatedConv1?.history.length === 1 && updatedConv1.history[0].content === 'Hi there!', 'Message should be added');
  assert(new Date(updatedConv1!.lastUpdatedAt).getTime() > new Date(originalLastUpdated).getTime(), 'lastUpdatedAt should be updated');
  const addMessageToNonExistent = instance1.addMessageToConversation('non-existent-id', messageToAdd);
  assert(addMessageToNonExistent === undefined, 'Should not add message to non-existent conversation');
  console.log('✓ Add Message to Conversation Test Passed');

  // 5. List Conversations
  list = instance1.listConversations() as ConversationSummary[];
  // We have conv1 and conv2
  assert(list.length >= 2, 'List conversations should return at least two conversations created in tests'); 
  const conv1Summary = list.find((c: ConversationSummary) => c.id === conv1.id);
  assert(conv1Summary !== undefined, 'conv1 should be in the list');
  assert(conv1Summary?.messageCount === 1, 'conv1 summary should show 1 message');

  // Create another one for more robust list testing
  const conv3 = instance1.createConversation();
  conversationIds.push(conv3.id);
  list = instance1.listConversations() as ConversationSummary[];
  assert(list.some((c: ConversationSummary) => c.id === conv3.id), 'Newly created conv3 should be in the list');
  console.log('✓ List Conversations Test Passed');


  // 6. Delete Conversation
  const deleteResult = instance1.deleteConversation(conv1.id);
  assert(deleteResult === true, 'Deleting an existing conversation should return true');
  assert(instance1.getConversation(conv1.id) === undefined, 'Deleted conversation should not be retrievable');
  list = instance1.listConversations() as ConversationSummary[];
  assert(!list.some((c: ConversationSummary) => c.id === conv1.id), 'Deleted conv1 should not be in the list');
  
  const deleteNonExistentResult = instance1.deleteConversation('non-existent-id-for-delete');
  assert(deleteNonExistentResult === false, 'Deleting a non-existent conversation should return false');
  console.log('✓ Delete Conversation Test Passed');

  // Cleanup remaining test conversations
  conversationIds.forEach(id => {
    // Only remove from conversationIds if deletion was successful
    if (instance1.deleteConversation(id)) {
      // Optional: log successful cleanup
    }
  });
  
  // Filter out successfully deleted IDs from conversationIds array
  // to check if any persist.
  const remainingTestConvIds = conversationIds.filter((id: string) => instance1.getConversation(id) !== undefined);
  const finalList = instance1.listConversations() as ConversationSummary[];
  
  // Check if any of the initial test conversation IDs are still present in the list.
  const testConversationsStillPresent = finalList.filter((c: ConversationSummary) => remainingTestConvIds.includes(c.id!));
  assert(testConversationsStillPresent.length === 0, 'All test conversations should be cleaned up and not present in the final list.');

  console.log('All ConversationManager Tests Passed!');
})().catch(e => {
  console.error('Test run failed:', e);
  process.exit(1); // Indicate failure
});
