const { processMessage } = require('./src/services/ai-agent');
require('dotenv').config();

async function test() {
  console.log("Testing AI Agent with 'Bonjour'...");
  try {
    const result = await processMessage('test_phone_123', 'Bonjour');
    console.log("\n✅ AI Agent Result:");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("\n❌ Test failed with error:", err.message);
  }
}

test();
