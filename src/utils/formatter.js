'use strict';

/**
 * Build a WhatsApp text message payload
 */
function buildTextMessage(to, text) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: truncate(text, 4096) },
  };
}

/**
 * Build a WhatsApp interactive button message payload (max 3 buttons)
 */
function buildButtonMessage(to, headerText, bodyText, buttons) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'text', text: truncate(headerText, 60) },
      body: { text: truncate(bodyText, 1024) },
      action: {
        buttons: buttons.slice(0, 3).map((btn, i) => ({
          type: 'reply',
          reply: {
            id: `btn_${i}_${btn.id || btn.title.toLowerCase().replace(/\s+/g, '_')}`,
            title: truncate(btn.title, 20),
          },
        })),
      },
    },
  };
}

/**
 * Format escalation message for user (FR/EN)
 */
function escalationUserMessage(lang, summary) {
  if (lang === 'en') {
    return `🙏 I'm transferring your request to an ISETAG advisor.\n\n📝 Summary of your question:\n_${summary}_\n\nYou will be contacted soon. Thank you for your patience!`;
  }
  return `🙏 Je transfère votre demande à un conseiller ISETAG.\n\n📝 Résumé de votre question :\n_${summary}_\n\nVous serez contacté(e) bientôt. Merci de votre patience !`;
}

/**
 * Format escalation alert for admin
 */
function escalationAdminMessage(phoneHashShort, summary, lang) {
  const time = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Douala' });
  return (
    `🚨 *ESCALADE ISETAG*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 Étudiant: \`${phoneHashShort}\`\n` +
    `🌐 Langue: ${lang === 'en' ? 'Anglais' : 'Français'}\n` +
    `📝 Résumé: ${summary}\n` +
    `🕐 Heure: ${time}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `→ _Répondre manuellement à cet étudiant_`
  );
}

/**
 * Rate limit message
 */
function rateLimitMessage(lang) {
  if (lang === 'en') {
    return '⚠️ You are sending messages too quickly. Please wait a moment and try again.';
  }
  return '⚠️ Vous envoyez des messages trop rapidement. Veuillez patienter un moment et réessayer.';
}

/**
 * Escalated session message
 */
function escalatedSessionMessage(lang) {
  if (lang === 'en') {
    return '⏳ An ISETAG advisor will reply to you shortly. Please wait.';
  }
  return '⏳ Un conseiller ISETAG va vous répondre bientôt. Veuillez patienter.';
}

/**
 * No match / fallback message
 */
function noMatchMessage(lang) {
  if (lang === 'en') {
    return "🤔 I couldn't find a precise answer to your question. I'm forwarding your request to an advisor who will help you shortly.";
  }
  return "🤔 Je n'ai pas trouvé de réponse précise à votre question. Je transmets votre demande à un conseiller qui vous aidera bientôt.";
}

/**
 * Voice note fallback message
 */
function audioFallbackMessage(lang) {
  if (lang === 'en') {
    return "🎤 Sorry, I couldn't process your voice note. Could you type your question? 🙏";
  }
  return '🎤 Désolé, je n\'ai pas pu traiter votre message vocal. Pouvez-vous écrire votre question ? 🙏';
}

/**
 * Welcome prefix for first message
 */
function welcomePrefix(lang) {
  if (lang === 'en') return 'Hello! 😊 ';
  return 'Bonjour ! 😊 ';
}

/**
 * Truncate text to max length
 */
function truncate(text, maxLen) {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen - 3) + '...' : text;
}

module.exports = {
  buildTextMessage,
  buildButtonMessage,
  escalationUserMessage,
  escalationAdminMessage,
  rateLimitMessage,
  escalatedSessionMessage,
  noMatchMessage,
  audioFallbackMessage,
  welcomePrefix,
  truncate,
};
