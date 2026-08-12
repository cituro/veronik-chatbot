// Curatare text si spargere in bucati (chunks) pentru cautare si context.

function cleanText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Sparge textul in bucati de ~maxLen caractere, cu suprapunere, respectand
// pe cat posibil limitele de paragraf/propozitie, ca sa nu taie ideile la mijloc.
function chunkText(text, { maxLen = 900, overlap = 150 } = {}) {
  const clean = cleanText(text);
  if (!clean) return [];

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim().length > 0) chunks.push(current.trim());
    current = "";
  };

  for (const para of paragraphs) {
    if (para.length > maxLen) {
      // paragraf foarte lung: taiem pe propozitii
      const sentences = para.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if ((current + " " + sentence).trim().length > maxLen) {
          pushCurrent();
        }
        current = (current + " " + sentence).trim();
        if (current.length > maxLen) {
          chunks.push(current.slice(0, maxLen));
          current = current.slice(Math.max(0, maxLen - overlap));
        }
      }
      continue;
    }

    if ((current + "\n\n" + para).trim().length > maxLen) {
      pushCurrent();
    }
    current = current ? current + "\n\n" + para : para;
  }
  pushCurrent();

  return chunks;
}

const STOPWORDS = new Set(
  [
    "si", "sau", "de", "la", "in", "cu", "din", "pe", "un", "o", "sa", "se",
    "ce", "care", "este", "sunt", "pentru", "ca", "cum", "mai", "nu", "au",
    "va", "am", "ai", "are", "fi", "fost", "acest", "aceasta", "acesta",
    "aceste", "acestor", "the", "and", "for", "you", "your", "with", "from",
    "that", "this", "are", "was", "were", "will", "can", "has", "have",
  ].map((w) => w.toLowerCase())
);

function tokenize(text) {
  return cleanText(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // scoate diacritice pentru potrivire mai robusta
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((tok) => tok.length > 1 && !STOPWORDS.has(tok));
}

module.exports = { cleanText, chunkText, tokenize };
