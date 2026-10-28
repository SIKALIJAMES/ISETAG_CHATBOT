'use strict';
const fetch = require('node-fetch');

const FB_BASE_URL = 'https://graph.facebook.com/v20.0';

/**
 * Send a text message via Messenger Send API
 */
async function sendTextMessage(recipientId, text) {
  const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error('[MESSENGER] Missing Page Access Token');
    return;
  }

  try {
    const response = await fetch(`${FB_BASE_URL}/me/messages?access_token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: text },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[MESSENGER] API Error:', JSON.stringify(result));
    }
    return result;
  } catch (err) {
    console.error('[MESSENGER] Fetch error:', err.message);
  }
}

/**
 * Send an image via Messenger Send API (using a public URL)
 */
async function sendImageMessage(recipientId, imageUrl) {
  const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  if (!token) return;

  try {
    const response = await fetch(`${FB_BASE_URL}/me/messages?access_token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'image',
            payload: {
              url: imageUrl,
              is_reusable: true
            }
          }
        },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[MESSENGER] Image API Error:', JSON.stringify(result));
    }
    return result;
  } catch (err) {
    console.error('[MESSENGER] Image Send error:', err.message);
  }
}

/**
 * Send a file/document via Messenger Send API (using a public URL)
 */
async function sendDocumentMessage(recipientId, docUrl) {
  const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  if (!token) return;

  try {
    const response = await fetch(`${FB_BASE_URL}/me/messages?access_token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'file',
            payload: {
              url: docUrl,
              is_reusable: true
            }
          }
        },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[MESSENGER] Document API Error:', JSON.stringify(result));
    }
    return result;
  } catch (err) {
    console.error('[MESSENGER] Document Send error:', err.message);
  }
}

/**
 * Send a Private Reply to a Facebook Page comment via Messenger Send API
 * recipient: { comment_id: "<COMMENT_ID>" }
 */
async function sendPrivateReply(commentId, text) {
  const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error('[MESSENGER] Missing Page Access Token for private reply');
    return null;
  }

  try {
    const response = await fetch(`${FB_BASE_URL}/me/messages?access_token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: { text },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      // Do not log user text or PII, only API error code and subcode
      console.warn(`[MESSENGER] Private reply API warning: HTTP ${response.status} - code: ${result?.error?.code}, subcode: ${result?.error?.error_subcode}, type: ${result?.error?.type}`);
      return { success: false, error: result.error };
    }
    return { success: true, result };
  } catch (err) {
    console.error('[MESSENGER] Private reply network error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Publish a public reply comment to an existing Facebook comment
 * POST /{comment-id}/comments
 */
async function sendPublicCommentReply(commentId, text) {
  const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error('[MESSENGER] Missing Page Access Token for public comment');
    return null;
  }

  try {
    const response = await fetch(`${FB_BASE_URL}/${commentId}/comments?access_token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: text }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.warn(`[MESSENGER] Public comment reply warning: HTTP ${response.status} - code: ${result?.error?.code}`);
      return { success: false, error: result.error };
    }
    return { success: true, result };
  } catch (err) {
    console.error('[MESSENGER] Public comment network error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Like a Facebook Page comment
 * POST /{comment-id}/likes
 */
async function likeComment(commentId) {
  const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const response = await fetch(`${FB_BASE_URL}/${commentId}/likes?access_token=${token}`, {
      method: 'POST',
    });

    const result = await response.json();
    return { success: response.ok, result };
  } catch (err) {
    console.warn('[MESSENGER] Like comment network error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendTextMessage,
  sendImageMessage,
  sendDocumentMessage,
  sendPrivateReply,
  sendPublicCommentReply,
  likeComment
};
