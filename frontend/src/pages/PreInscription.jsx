import React, { useState } from 'react';

const DOMAINS = {
  'TIC': {
    label: '💻 Technologies de l\'Information et de la Communication',
    specialties: [
      'Génie Logiciel',
      'Infographie & Web Design',
      'E-commerce',
      'Marketing Numérique',
      'Intelligence Artificielle',
    ],
  },
  'Commerce': {
    label: '📊 Commerce – Gestion – Droit',
    specialties: [
      'Marketing',
      'Commerce et Vente',
      'Commerce International',
      'Douane & Transit',
    ],
  },
  'Industrie': {
    label: '⚙️ Industrie et Technologie',
    specialties: [
      'Mécatronique',
      'Menuiserie-Ébénisterie',
      'Énergies Renouvelables (Solaire)',
    ],
  },
  'Maritime': {
    label: '⚓ Sciences Portuaires et Maritimes',
    specialties: [
      'Électromécanique Navale',
      'Gestion Logistique Portuaire & Maritime',
      'Sciences Nautiques',
      'Aquaculture',
      'Techniques de Pêche Maritime',
    ],
  },
};

const LEVELS = ['BTS / HND (2 ans)', 'Licence / Bachelor (3 ans)', 'Master (5 ans)'];

const REGIONS_CM = [
  'Adamaoua', 'Centre', 'Est', 'Extrême-Nord', 'Littoral',
  'Nord', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Ouest', 'Hors Cameroun',
];

// ─── Reusable field components ───────────────────────────────────

function Label({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
      {children} {required && <span className="text-yellow-400">*</span>}
    </label>
  );
}

function Input({ label, required, ...props }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      <input
        required={required}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25
                   focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20
                   transition-all text-sm"
        {...props}
      />
    </div>
  );
}

function Select({ label, required, options, placeholder, ...props }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      <select
        required={required}
        className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 text-white
                   focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20
                   transition-all text-sm appearance-none"
        {...props}
      >
        <option value="">{placeholder || 'Sélectionner…'}</option>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  );
}

function Textarea({ label, required, ...props }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      <textarea
        required={required}
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25
                   focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20
                   transition-all text-sm resize-none"
        {...props}
      />
    </div>
  );
}

function FileField({ label, name, hint, onChange, value }) {
  return (
    <label className="block cursor-pointer group">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">{label}</div>
      <div className={`flex items-center gap-3 border border-dashed rounded-xl px-4 py-3 transition-all
        ${value ? 'border-green-500/50 bg-green-500/5' : 'border-white/15 bg-white/3 hover:border-yellow-400/50 hover:bg-yellow-400/5'}`}>
        <span className="text-xl">{value ? '✅' : '📎'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white/70 truncate">
            {value ? value.name : 'Cliquer pour choisir un fichier'}
          </div>
          {hint && <div className="text-xs text-white/35 mt-0.5">{hint}</div>}
        </div>
        {value && (
          <span className="text-xs text-green-400 font-medium whitespace-nowrap">Chargé ✓</span>
        )}
      </div>
      <input
        type="file"
        name={name}
        className="sr-only"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={e => onChange(name, e.target.files[0] || null)}
      />
    </label>
  );
}

function SectionHeader({ icon, number, title, subtitle }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-green-400/10
                      border border-yellow-400/20 flex items-center justify-center text-2xl flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-0.5">Section {number}</div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function PreInscription() {
  const [form, setForm] = useState({
    full_name: '', sex: '', date_of_birth: '', place_of_birth: '', region: '',
    nationality: 'Camerounaise', religion: '', blood_group: '',
    phone: '', email: '',
    emergency_contact_1: '', emergency_phone_1: '',
    emergency_contact_2: '', emergency_phone_2: '',
    health_notes: '',
    former_school: '', graduation_year: '',
    domain: '', specialty: '', study_level: '',
  });

  const [files, setFiles] = useState({
    doc_photo: null, doc_probatoire: null, doc_bac: null,
    doc_cv: null, doc_medical: null, doc_cni: null, doc_birth_cert: null,
  });

  const [step, setStep] = useState(1); // 1=form, 2=success
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const onFileChange = (name, file) => setFiles(f => ({ ...f, [name]: file }));

  const specialties = DOMAINS[form.domain]?.specialties || [];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      Object.entries(files).forEach(([k, v]) => v && fd.append(k, v));

      const res = await fetch('/api/preinscription', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600
                          flex items-center justify-center text-5xl mx-auto mb-6
                          shadow-[0_0_60px_rgba(93,203,106,0.4)] animate-pulse">
            ✅
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-3">
            Pré-inscription envoyée !
          </h1>
          <p className="text-slate-400 mb-8 text-base leading-relaxed">
            Nous avons bien reçu ta demande de pré-inscription à <strong className="text-yellow-400">ISETAG</strong>.<br />
            Notre équipe te contactera dans les <strong className="text-white">24–48h</strong> pour
            confirmer ton dossier et te donner les prochaines étapes pour l'inscription physique.
          </p>
          <div className="glass rounded-2xl p-6 text-left mb-6">
            <div className="text-sm font-bold text-white mb-3">📞 Besoin d'aide ?</div>
            <div className="space-y-2 text-sm text-slate-300">
              <div>📱 <span className="text-white font-medium">+237 676 079 849</span></div>
              <div>📱 <span className="text-white font-medium">+237 690 609 511</span></div>
              <div>📱 <span className="text-white font-medium">+237 659 855 800</span></div>
              <div>🌐 <a href="https://www.isetag.cm" className="text-yellow-400 hover:underline">www.isetag.cm</a></div>
            </div>
          </div>
          <a
            href="https://wa.me/237676079849"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-black text-base
                       bg-gradient-to-r from-yellow-400 to-green-400
                       shadow-[0_4px_24px_rgba(93,203,106,0.35)] hover:shadow-[0_8px_32px_rgba(93,203,106,0.5)]
                       transition-all hover:scale-105 active:scale-95"
          >
            💬 Parler à un conseiller WhatsApp
          </a>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0c0c0c]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 via-transparent to-green-400/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-1 bg-gradient-to-r from-yellow-400 to-green-400 rounded-b-full opacity-60" />
        <div className="relative max-w-3xl mx-auto px-6 py-8 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-green-400 flex items-center justify-center text-black font-black text-sm">I</div>
            <span className="text-2xl font-black text-white tracking-tight">ISETAG</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
            Fiche de <span className="bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">Pré-inscription</span>
          </h1>
          <p className="text-slate-400 text-base max-w-lg mx-auto">
            Remplis ce formulaire pour réserver ta place à l'ISETAG.<br />
            <span className="text-yellow-400 font-medium">Gratuit · Sans engagement · L'inscription se fait en présentiel.</span>
          </p>
          {/* Progress bar */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {['Identité', 'Formation', 'Documents'].map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-green-400 flex items-center justify-center text-black text-xs font-black">{i + 1}</div>
                  <span className="text-xs text-white/60 hidden sm:inline">{s}</span>
                </div>
                {i < 2 && <div className="flex-1 h-px bg-white/10 max-w-12" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 py-10">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── Section I : Identité ── */}
          <div className="bg-white/3 border border-white/8 rounded-3xl p-6 md:p-8">
            <SectionHeader icon="👤" number="I" title="Identité du Candidat" subtitle="Informations personnelles requises pour le dossier officiel" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <Input label="Nom et Prénom(s)" name="full_name" required
                  placeholder="Ex: MBARGA Jean-Paul"
                  value={form.full_name} onChange={e => set('full_name', e.target.value)} />
              </div>
              <Select label="Sexe" required options={[{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }]}
                value={form.sex} onChange={e => set('sex', e.target.value)} />
              <Input label="Groupe sanguin" placeholder="Ex: O+, A-…"
                value={form.blood_group} onChange={e => set('blood_group', e.target.value)} />
              <Input label="Date de naissance" type="date" required
                value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
              <Input label="Lieu de naissance" placeholder="Ex: Bafoussam"
                value={form.place_of_birth} onChange={e => set('place_of_birth', e.target.value)} />
              <Select label="Région d'origine" options={REGIONS_CM}
                value={form.region} onChange={e => set('region', e.target.value)} />
              <Input label="Nationalité" placeholder="Ex: Camerounaise" required
                value={form.nationality} onChange={e => set('nationality', e.target.value)} />
              <Input label="Religion" placeholder="Ex: Chrétien, Musulman…"
                value={form.religion} onChange={e => set('religion', e.target.value)} />
            </div>
          </div>

          {/* ── Section II : Contacts ── */}
          <div className="bg-white/3 border border-white/8 rounded-3xl p-6 md:p-8">
            <SectionHeader icon="📞" number="II" title="Coordonnées & Contacts" subtitle="Pour te joindre et en cas d'urgence" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input label="Téléphone" type="tel" required placeholder="+237 6XX XXX XXX"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
              <Input label="Email" type="email" placeholder="exemple@mail.com"
                value={form.email} onChange={e => set('email', e.target.value)} />
              <div className="sm:col-span-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-t border-white/5 pt-4">
                  Personne à contacter en cas d'urgence
                </div>
              </div>
              <Input label="Contact urgence 1 — Nom" placeholder="Nom & lien de parenté"
                value={form.emergency_contact_1} onChange={e => set('emergency_contact_1', e.target.value)} />
              <Input label="Contact urgence 1 — Tél" type="tel" placeholder="+237 6XX XXX XXX"
                value={form.emergency_phone_1} onChange={e => set('emergency_phone_1', e.target.value)} />
              <Input label="Contact urgence 2 — Nom" placeholder="Nom & lien de parenté"
                value={form.emergency_contact_2} onChange={e => set('emergency_contact_2', e.target.value)} />
              <Input label="Contact urgence 2 — Tél" type="tel" placeholder="+237 6XX XXX XXX"
                value={form.emergency_phone_2} onChange={e => set('emergency_phone_2', e.target.value)} />
              <div className="sm:col-span-2">
                <Textarea label="Problèmes de santé particuliers" placeholder="(Optionnel) Allergies, maladies chroniques, handicap…"
                  value={form.health_notes} onChange={e => set('health_notes', e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── Section III : Parcours scolaire ── */}
          <div className="bg-white/3 border border-white/8 rounded-3xl p-6 md:p-8">
            <SectionHeader icon="🎓" number="III" title="Parcours Scolaire" subtitle="Ton établissement d'origine et ton diplôme" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <Input label="Établissement d'origine" placeholder="Ex: Lycée Général Leclerc de Yaoundé"
                  value={form.former_school} onChange={e => set('former_school', e.target.value)} />
              </div>
              <Input label="Année d'obtention du diplôme" placeholder="Ex: 2024"
                value={form.graduation_year} onChange={e => set('graduation_year', e.target.value)} />
            </div>
          </div>

          {/* ── Section IV : Choix de filière ── */}
          <div className="bg-white/3 border border-white/8 rounded-3xl p-6 md:p-8">
            <SectionHeader icon="🧭" number="IV" title="Choix de Filière" subtitle="Le domaine et la spécialité qui t'intéressent à l'ISETAG" />
            <div className="grid grid-cols-1 gap-5">
              {/* Domain cards */}
              <div>
                <Label required>Domaine</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  {Object.entries(DOMAINS).map(([key, { label }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { set('domain', key); set('specialty', ''); }}
                      className={`text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-all
                        ${form.domain === key
                          ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400 shadow-[0_0_20px_rgba(234,231,74,0.15)]'
                          : 'border-white/10 bg-white/3 text-white/70 hover:border-white/25 hover:text-white'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specialty */}
              {form.domain && (
                <Select label="Spécialité" required options={specialties} placeholder="Choisir une spécialité…"
                  value={form.specialty} onChange={e => set('specialty', e.target.value)} />
              )}

              {/* Level */}
              <Select label="Niveau d'entrée souhaité" required
                options={LEVELS} placeholder="Choisir un niveau…"
                value={form.study_level} onChange={e => set('study_level', e.target.value)} />
            </div>
          </div>

          {/* ── Section V : Documents ── */}
          <div className="bg-white/3 border border-white/8 rounded-3xl p-6 md:p-8">
            <SectionHeader icon="📁" number="V" title="Pièces du Dossier" subtitle="Formats acceptés : PDF, JPG, PNG — Taille max : 5 Mo par fichier" />

            {/* Info banner */}
            <div className="flex gap-3 bg-blue-500/8 border border-blue-400/20 rounded-xl p-4 mb-6">
              <span className="text-xl flex-shrink-0">ℹ️</span>
              <p className="text-sm text-blue-200/80 leading-relaxed">
                Les documents ne sont <strong className="text-white">pas obligatoires</strong> pour la pré-inscription.
                Tu peux les apporter lors de l'inscription physique à l'ISETAG. Toutefois, les fournir maintenant
                accélère le traitement de ton dossier.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FileField name="doc_photo" label="Photo 4×4 (récente)" hint="JPG ou PNG"
                value={files.doc_photo} onChange={onFileChange} />
              <FileField name="doc_cni" label="Photocopie CNI / Passeport" hint="PDF, JPG ou PNG"
                value={files.doc_cni} onChange={onFileChange} />
              <FileField name="doc_probatoire" label="Copie certifiée Probatoire / GCE OL" hint="PDF, JPG ou PNG"
                value={files.doc_probatoire} onChange={onFileChange} />
              <FileField name="doc_bac" label="Copie certifiée Bac / GCE AL" hint="PDF, JPG ou PNG"
                value={files.doc_bac} onChange={onFileChange} />
              <FileField name="doc_cv" label="Curriculum Vitae" hint="PDF recommandé"
                value={files.doc_cv} onChange={onFileChange} />
              <FileField name="doc_medical" label="Certificat médical (- de 3 mois)" hint="PDF, JPG ou PNG"
                value={files.doc_medical} onChange={onFileChange} />
              <div className="sm:col-span-2">
                <FileField name="doc_birth_cert" label="Acte de naissance / Extrait de naissance" hint="PDF, JPG ou PNG"
                  value={files.doc_birth_cert} onChange={onFileChange} />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex gap-3 bg-red-500/10 border border-red-400/25 rounded-2xl p-4">
              <span className="text-xl">❌</span>
              <div>
                <div className="text-sm font-bold text-red-400 mb-0.5">Erreur</div>
                <div className="text-sm text-red-300/80">{error}</div>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="text-center pb-4">
            <button
              type="submit"
              disabled={submitting}
              id="submit-preinscription"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-extrabold text-black text-lg
                         bg-gradient-to-r from-yellow-400 to-green-400
                         shadow-[0_4px_32px_rgba(234,231,74,0.3)] hover:shadow-[0_8px_48px_rgba(93,203,106,0.4)]
                         transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Envoi en cours…
                </>
              ) : '🚀 Soumettre ma pré-inscription'}
            </button>
            <p className="text-xs text-slate-500 mt-4">
              En soumettant ce formulaire, tu confirmes que les informations fournies sont correctes.<br />
              <strong className="text-slate-400">Aucun frais</strong> n'est demandé à ce stade.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-white/5 mt-12 pt-8 text-center text-xs text-slate-500 space-y-1">
          <div className="font-semibold text-slate-400">ISETAG — Institut Supérieur Évangélique des Technologies Appliquées et de Gestion</div>
          <div>Entre Tradex Yassa et l'Hôpital Gynéco-Obstétrique de Douala</div>
          <div>+237 676 079 849 · +237 690 609 511 · <a href="https://www.isetag.cm" className="text-yellow-400/70 hover:text-yellow-400">www.isetag.cm</a></div>
        </div>
      </main>
    </div>
  );
}
