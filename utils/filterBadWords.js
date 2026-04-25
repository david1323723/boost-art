/**
 * Bad Word Filter Utility
 * Scans message content for inappropriate / offensive language
 */

// Common bad words blacklist (English)
const BAD_WORDS = [
  'fuck', 'fck', 'fuk', 'fuc', 'fux',
  'shit', 'sht', 'sh1t',
  'bitch', 'b1tch', 'btch',
  'asshole', 'ashole', 'a-hole',
  'damn', 'dmn',
  'cunt', 'cnt',
  'dick', 'd1ck', 'dik',
  'cock', 'c0ck',
  'pussy', 'puss', 'pu$$y',
  'nigger', 'n1gger', 'nigga', 'n1gga',
  'faggot', 'fag', 'f4g',
  'whore', 'wh0re',
  'slut', 'slvt',
  'retard', 'r3tard',
  'kill yourself', 'kys',
  'stupid', 'idiot', 'moron', 'dumbass',
  'bastard', 'b4stard',
  'hell',
  'bullshit', 'bs',
  'crap',
  'jerk', 'jerkoff',
  'wanker', 'wank',
  'twat',
  'prick',
  'douche', 'douchebag',
  'motherfucker', 'mfer', 'mf',
  'sex', 'sexy', 'xxx', 'porn', 'p0rn',
  'rape', 'rapist',
  'pedophile', 'pedo',
  'terrorist', 'bomb',
  'suicide', 'die',
  'hate', 'hateful',
  'racist', 'racism',
  'nazi',
  'hitler'
];

/**
 * Normalize text for filtering
 * - Lowercase
 * - Remove common substitutions
 * - Remove extra spaces
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .replace(/[0@]/g, 'o')
    .replace(/1!/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/\$/g, 's')
    .replace(/\+/g, 't')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a message contains any bad words
 * @param {string} message - The message to check
 * @returns {Object} - { clean: boolean, warning?: string }
 */
function filterMessage(message) {
  if (!message || typeof message !== 'string') {
    return { clean: false, warning: 'Message cannot be empty.' };
  }

  const normalized = normalizeText(message);
  const words = normalized.split(/\s+/);
  
  const foundBadWords = [];
  
  // Check for exact word matches
  for (const word of words) {
    for (const badWord of BAD_WORDS) {
      if (word === badWord || word.includes(badWord)) {
        foundBadWords.push(badWord);
      }
    }
  }
  
  // Also check the full normalized string for multi-word phrases
  for (const badWord of BAD_WORDS) {
    if (badWord.includes(' ') && normalized.includes(badWord)) {
      foundBadWords.push(badWord);
    }
  }

  if (foundBadWords.length > 0) {
    return {
      clean: false,
      warning: 'Your message contains inappropriate language and was blocked.'
    };
  }

  return { clean: true };
}

/**
 * Sanitize a message by replacing bad words with asterisks
 * @param {string} message - The message to sanitize
 * @returns {string} - Sanitized message
 */
function sanitizeMessage(message) {
  if (!message || typeof message !== 'string') return message;
  
  let sanitized = message;
  const normalized = normalizeText(message);
  
  for (const badWord of BAD_WORDS) {
    const regex = new RegExp(`\\b${badWord}\\b`, 'gi');
    if (regex.test(normalized)) {
      sanitized = sanitized.replace(regex, '*'.repeat(badWord.length));
    }
  }
  
  return sanitized;
}

module.exports = {
  filterMessage,
  sanitizeMessage,
  BAD_WORDS
};

