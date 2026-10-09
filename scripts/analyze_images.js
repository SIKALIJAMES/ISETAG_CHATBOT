const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const dir = path.join(__dirname, '../images_brutes');
const outputFile = path.join(__dirname, '../images_analysis.json');

const files = fs.readdirSync(dir);
const nonHeic = files.filter(f => !f.toLowerCase().endsWith('.heic'));

const bySize = {};
const uniqueFiles = [];
nonHeic.forEach(f => {
  const s = fs.statSync(path.join(dir, f)).size;
  if (!bySize[s]) {
    bySize[s] = f;
    uniqueFiles.push(f);
  }
});

console.log(`Starting analysis of ${uniqueFiles.length} unique images...`);

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function analyzeOne(file, index, total) {
  const filePath = path.join(dir, file);
  const ext = path.extname(file).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  const base64 = fs.readFileSync(filePath).toString('base64');

  const prompt = `Tu es un expert en communication et IA pour l'institut supérieur ISETAG (Douala, Cameroun).
Analyse cette image officielle et réponds au format JSON STRICT suivant :
{
  "categorie": "Campus & Bâtiments" | "Bus & Transport" | "Ateliers & Pratique" | "Laboratoires & Salles de cours" | "Flyers & Affiches" | "Événements & Vie étudiante" | "Autre",
  "sujet_principal": "Brève description en 5 à 10 mots",
  "details_visuels": "Description détaillée de ce qui est visible",
  "texte_detecte": "Texte clé ou slogan visible sur l'image s'il y en a, sinon null",
  "utilite_chatbot": "Très haute" | "Moyenne" | "Faible",
  "scenario_envoi_whatsapp": "Situation exacte où le bot devrait envoyer cette photo à un prospect (ex: quand il demande le transport, la filière mécanique, les salles de classe, etc.)"
}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64 } }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  const json = await res.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error(json.error?.message || 'Empty response');

  return JSON.parse(rawText);
}

async function main() {
  let results = {};
  if (fs.existsSync(outputFile)) {
    try { results = JSON.parse(fs.readFileSync(outputFile, 'utf8')); } catch (e) {}
  }

  for (let i = 0; i < uniqueFiles.length; i++) {
    const file = uniqueFiles[i];
    if (results[file]) {
      console.log(`[${i + 1}/${uniqueFiles.length}] Already analyzed: ${file}`);
      continue;
    }

    try {
      console.log(`[${i + 1}/${uniqueFiles.length}] Analyzing: ${file}...`);
      const analysis = await analyzeOne(file, i + 1, uniqueFiles.length);
      results[file] = analysis;
      fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf8');
      console.log(`  -> Catégorie: ${analysis.categorie} | Utilité: ${analysis.utilite_chatbot}`);
    } catch (err) {
      console.error(`  ❌ Error on ${file}:`, err.message);
    }

    await delay(1200); // Respect rate limits
  }

  console.log('✅ Analysis complete! Saved to images_analysis.json');
}

main();
