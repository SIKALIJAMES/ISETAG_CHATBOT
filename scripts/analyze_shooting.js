const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const dir = path.join(__dirname, '../temp_shooting_resized');
const outputFile = path.join(__dirname, '../shooting_analysis.json');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function analyzeOne(file) {
  const filePath = path.join(dir, file);
  const ext = path.extname(file).toLowerCase();
  const mimeType = 'image/jpeg';
  const base64 = fs.readFileSync(filePath).toString('base64');

  const prompt = `Tu es un expert en communication et conseiller d'orientation pour l'institut universitaire ISETAG (Douala, Cameroun).
Analyse cette photo issue du shooting officiel ISETAG (dossier SHOOTING ISETAG - FBS PICTURES).
Réponds impérativement au format JSON STRICT suivant :
{
  "sujet_principal": "Ce qu'on voit principalement sur la photo (ex: Étudiants en amphi, laboratoire informatique, atelier mécanique, uniforme de marin, accueil, bibliothèque, étudiants souriants, etc.)",
  "filiere_ou_domaine": "La filière académique ou le domaine concerné (ex: Maritime, Informatique, Génie Électrique, BTP / Génie Civil, Mécanique, Gestion & Commerce, Cadre Général / Vie Étudiante, Accueil / Orientation)",
  "description_detaillee": "Description précise de la scène, des personnes, des équipements, de la tenue/uniforme, des expressions, de la qualité visuelle",
  "utilite_prospection": "Indispensable" | "Très utile" | "Utile" | "Doublon" | "Non recommandée",
  "scenario_prospect": "Dans quelle situation précise de discussion avec un prospect cette image doit être envoyée pour le convaincre ou répondre à sa question ?",
  "nom_fichier_recommande": "nom_clair_en_snake_case.jpeg"
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
        console.warn(`  ⚠️ Rate limit / error on attempt ${attempt}, waiting 10s...`);
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
  if (!fs.existsSync(dir)) {
    console.error("Directory not found yet: " + dir);
    return;
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg'));
  console.log(`Found ${files.length} resized images to analyze.`);

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
      console.log(`  -> ${analysis.filiere_ou_domaine} | ${analysis.utilite_prospection} : ${analysis.sujet_principal}`);
    } catch (err) {
      console.error(`  ❌ Error on ${file}:`, err.message);
    }

    await delay(2500);
  }

  console.log('✅ Analysis complete! Saved to shooting_analysis.json');
}

main();
