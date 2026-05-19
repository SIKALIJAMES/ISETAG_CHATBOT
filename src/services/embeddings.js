'use strict';
const OpenAI = require('openai');
const { query } = require('../config/database');

const fetch = require('node-fetch');

/**
 * Generate vector embedding for a text
 */
async function generateEmbedding(text) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-2',
        content: { parts: [{ text: text.replace(/\n/g, ' ') }] },
        outputDimensionality: 768
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.embedding.values;
  } catch (err) {
    console.error('[EMBEDDINGS] Generation error:', err.message);
    throw err;
  }
}

/**
 * Split text into chunks for RAG
 */
function chunkText(text, size = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += (size - overlap)) {
    chunks.push(words.slice(i, i + size).join(' '));
    if (i + size >= words.length) break;
  }
  return chunks;
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Upload and vectorise a document
 */
async function uploadKnowledge(text, source, category = 'general') {
  const chunks = chunkText(text);
  console.log(`[EMBEDDINGS] Processing ${chunks.length} chunks for ${source}`);

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk);
    await query(
      `INSERT INTO knowledge_chunks (content, embedding, source, category) 
       VALUES ($1, $2, $3, $4)`,
      [chunk, JSON.stringify(embedding), source, category]
    );
    // Add 1s delay to prevent "Resource exhausted" API rate limits
    await delay(1000);
  }
}

/**
 * Search relevant chunks using cosine similarity
 */
async function searchRelevant(userQuery, limit = 5) {
  const vector = await generateEmbedding(userQuery);
  const vectorStr = `[${vector.join(',')}]`;

  const res = await query(
    `SELECT content, source, 1 - (embedding <=> $1::vector) as similarity
     FROM knowledge_chunks
     WHERE 1 - (embedding <=> $1::vector) > 0.4
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vectorStr, limit]
  );

  return res.rows;
}

module.exports = {
  generateEmbedding,
  uploadKnowledge,
  searchRelevant,
};
