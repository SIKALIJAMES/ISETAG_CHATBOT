const fetch = require('node-fetch');
require('dotenv').config();

async function listModels() {
  console.log("Fetching available models with your Gemini Key...");
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.models) {
      console.log("\n✅ AVAILABLE MODELS:");
      data.models.forEach(m => {
        console.log(`- ${m.name} (Methods: ${m.supportedGenerationMethods?.join(', ') || 'none'})`);
      });
    } else {
      console.log("\n❌ ERROR or EMPTY RESPONSE:", data);
    }
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

listModels();
