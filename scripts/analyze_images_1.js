const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const dir = path.join(__dirname, '../images_brutes_1');
const outputFile = path.join(__dirname, '../images_analysis_1.json');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'));

console.log(`Starting analysis of ${files.length} images from images_brutes_1...`);

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function analyzeOne(file) {
  const filePath = path.join(dir, file);
  const ext = path.extname(file).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  const base64 = fs.readFileSync(filePath).toString('base64');

  const prompt = `Tu es un expert en communication et IA pour l'institut supérieur ISETAG (Douala, Cameroun).
Analyse cette photo officielle des ateliers/campus/infrastructures et réponds au format JSON STRICT suivant :
{
  "filiere_concernee": "Froid & Climatisation" | "Mécanique Automobile & Mécatronique" | "Génie Électrique & Électronique" | "Informatique & Multimédia" | "Campus & Bâtiment" | "Autre",
  "titre": "Titre court en 4 à 8 mots",
  "description_visuelle": "Description détaillée des équipements, outils, moteurs, bancs d'essai, véhicules ou installations visibles",
  "utilite": "Très haute" | "Moyenne" | "Faible",
  "scenario_declenchement": "Situation exacte où le bot WhatsApp doit envoyer cette photo à un prospect (ex: quand il demande les ateliers de froid, la mécanique auto, les moteurs, etc.)",
  "nom_fichier_suggere": "Nom de fichier clair en snake_case (ex: atelier_froid_clim.jpeg, atelier_mecanique_moteur.jpeg, etc.)"
}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
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
    if (json.error) {
      if (attempt < 3 && (json.error.code === 429 || json.error.code === 503)) {
        console.warn(`  ⚠️ Rate limit or 503 on attempt ${attempt}, waiting 10s...`);
        await delay(10000);
        continue;
      }
      throw new Error(json.error.message);
    }

    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response');
    return JSON.parse(rawText);
  }
}

async function main() {
  let results = {};
  if (fs.existsSync(outputFile)) {
    try { results = JSON.parse(fs.readFileSync(outputFile, 'utf8')); } catch (e) {}
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (results[file]) {
      console.log(`[${i + 1}/${files.length}] Already analyzed: ${file}`);
      continue;
    }

    try {
      console.log(`[${i + 1}/${files.length}] Analyzing: ${file}...`);
      const analysis = await analyzeOne(file);
      results[file] = analysis;
      fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf8');
      console.log(`  -> ${analysis.filiere_concernee} : ${analysis.titre} (${analysis.nom_fichier_suggere})`);
    } catch (err) {
      console.error(`  ❌ Error on ${file}:`, err.message);
    }

    await delay(3500); // 3.5s delay to stay safely under 15 requests/min limit
  }

  console.log('✅ Analysis complete! Saved to images_analysis_1.json');
}

main();
