const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../temp_shooting_resized');
const dstDir = path.join(__dirname, '../public/media');

const mappings = {
  // Remplacement/mise à niveau qualité HD pro
  'IMG_6080.JPG.jpeg': 'bibliotheque_isetag.jpeg',
  'IMG_6083.JPG.jpeg': 'atelier_genie_civil.jpeg',
  'IMG_6084.JPG.jpeg': 'atelier_plomberie_fluides.jpeg',
  'IMG_6087.JPG.jpeg': 'salle_informatique.jpeg',
  'IMG_6088.JPG.jpeg': 'atelier_genie_electrique.jpeg',
  'IMG_6096.JPG.jpeg': 'campus_facade_isetag.jpeg',
  'IMG_6098.JPG.jpeg': 'atelier_mecanique_automobile.jpeg',
  'IMG_6102.JPG.jpeg': 'atelier_mecatronique_moteur.jpeg',
  'IMG_6103.JPG.jpeg': 'atelier_bois.jpeg',

  // Nouvelles images à forte valeur ajoutée
  'IMG_6090.JPG.jpeg': 'etudiante_genie_electrique.jpeg',
  'IMG_6092.JPG.jpeg': 'salle_classe_maritime_cours.jpeg',
  'IMG_6099.JPG.jpeg': 'etudiante_mecanique_injection.jpeg',
  'IMG_6101.JPG.jpeg': 'atelier_mecanique_reparation_voiture.jpeg',
  'IMG_6104.JPG.jpeg': 'etudiante_atelier_menuiserie.jpeg',
  'IMG_6108.JPG.jpeg': 'campus_avec_bus_isetag.jpeg',
  'IMG_6109.JPG.jpeg': 'residence_batiment_exterieur.jpeg'
};

console.log('Copying selected shooting images to public/media...');
for (const [srcName, dstName] of Object.entries(mappings)) {
  const srcPath = path.join(srcDir, srcName);
  const dstPath = path.join(dstDir, dstName);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, dstPath);
    const stat = fs.statSync(dstPath);
    console.log(`✅ Copied ${srcName} -> ${dstName} (${Math.round(stat.size / 1024)} KB)`);
  } else {
    console.warn(`⚠️ Source not found: ${srcPath}`);
  }
}
console.log('Done copying!');
