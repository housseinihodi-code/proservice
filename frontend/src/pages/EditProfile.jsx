import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Save, Upload, Plus, X, FileText, Trash2 } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { usersAPI, professionalsAPI, documentsAPI, tradesAPI, openPrivateDocument, mediaUrl } from "../services/api";
import Loader from "../components/common/Loader";

import { COUNTRIES, DEFAULT_COUNTRY, PHONE_PLACEHOLDER, DOMAINS, groupTradesByDomain, apiError } from "../constants/locale";
import { Field, SubmitButton } from "../components/common/Form";

const MAX_TRADES = 5;
const DOC_TYPES = { ID_CARD: "Pièce d'identité", DIPLOMA: "Diplôme", CERTIFICATE: "Certificat", OTHER: "Autre" };

export default function EditProfile() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const isPro = user?.role === "PROFESSIONAL";
  const [activeTab, setActiveTab] = useState("info");
  const [docType, setDocType] = useState("ID_CARD");
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => professionalsAPI.getByUserId(user.id).then((r) => r.data),
    enabled: isPro,
  });

  const { data: documents } = useQuery({
    queryKey: ["my-documents"],
    queryFn: () => documentsAPI.myDocuments().then((r) => r.data),
    enabled: isPro,
  });

  const { register: regUser, handleSubmit: handleUser, formState: { errors: userErrors } } = useForm({
    mode: "onTouched",
    values: user ? { first_name: user.first_name, last_name: user.last_name, phone: user.phone, country: user.country || DEFAULT_COUNTRY, city: user.city } : {},
  });

  const { register: regPro, handleSubmit: handlePro, formState: { errors: proErrors } } = useForm({
    mode: "onTouched",
    values: profile ? { bio: profile.bio, years_experience: profile.years_experience, hourly_rate: profile.hourly_rate, fixed_rate: profile.fixed_rate, linkedin_url: profile.linkedin_url, website_url: profile.website_url } : {},
  });

  const [selectedDomains, setSelectedDomains] = useState([]);
  const [selectedTrades, setSelectedTrades] = useState([]);
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState("");

  // Le profil arrive après le premier rendu : on recopie ses valeurs une fois chargé,
  // sinon l'enregistrement effacerait les domaines, métiers et compétences existants.
  useEffect(() => {
    if (!profile) return;
    setSelectedDomains(profile.competence_domains || []);
    setSelectedTrades(profile.trades || []);
    setSkills(profile.skills || []);
  }, [profile]);

  const { data: trades } = useQuery({
    queryKey: ["trades"],
    queryFn: () => tradesAPI.list().then((r) => r.data),
    enabled: isPro,
    staleTime: 5 * 60 * 1000,
  });
  const tradeGroups = groupTradesByDomain(
    (trades || []).filter((t) => selectedDomains.length === 0 || selectedDomains.includes(t.domain) || selectedTrades.includes(t.name))
  );
  const toggleTrade = (name) => setSelectedTrades((prev) => {
    if (prev.includes(name)) return prev.filter((x) => x !== name);
    if (prev.length >= MAX_TRADES) { toast.error(`${MAX_TRADES} métiers maximum`); return prev; }
    return [...prev, name];
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => usersAPI.updateMe(data),
    onSuccess: (res) => { setUser(res.data); toast.success("Informations mises à jour"); },
    onError: (e) => toast.error(apiError(e, "Erreur lors de la mise à jour")),
  });

  const updateProMutation = useMutation({
    mutationFn: (data) => professionalsAPI.updateMyProfile(data),
    onSuccess: () => { queryClient.invalidateQueries(["my-profile"]); toast.success("Profil professionnel mis à jour"); },
    onError: (e) => toast.error(apiError(e, "Erreur lors de la mise à jour")),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: (file) => usersAPI.uploadAvatar(file),
    onSuccess: (res) => { setUser(res.data); toast.success("Photo mise à jour"); },
  });

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills((prev) => [...prev, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const toggleDomain = (d) => setSelectedDomains((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  if (isLoading) return <Loader />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Modifier mon profil</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
        {[["info", "Informations"], isPro && ["pro", "Profil pro"], isPro && ["docs", "Documents"]].filter(Boolean).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 sm:flex-none whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>{label}</button>
        ))}
      </div>

      {/* Info tab */}
      {activeTab === "info" && (
        <div className="card p-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              <img
                src={mediaUrl(user?.profile_picture_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.first_name || "") + " " + (user?.last_name || ""))}&background=2563eb&color=fff&size=80`}
                alt=""
                className="w-20 h-20 rounded-full object-cover ring-4 ring-primary-100"
              />
              <label className="absolute bottom-0 right-0 bg-primary-600 text-white rounded-full p-1.5 cursor-pointer hover:bg-primary-700">
                <Upload className="w-3 h-3" />
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files[0] && uploadAvatarMutation.mutate(e.target.files[0])} />
              </label>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{user?.first_name} {user?.last_name}</h2>
              <p className="text-gray-500 text-sm">{user?.email}</p>
            </div>
          </div>

          <form noValidate onSubmit={handleUser((data) => updateUserMutation.mutate({ ...data, first_name: data.first_name.trim(), last_name: data.last_name.trim(), phone: data.phone?.trim() || "", city: data.city?.trim() || "" }))} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Prénom" required error={userErrors.first_name?.message}>
                <input autoComplete="given-name" {...regUser("first_name", { required: "Indiquez votre prénom", validate: (v) => v.trim().length >= 2 || "2 caractères minimum" })} />
              </Field>
              <Field label="Nom" required error={userErrors.last_name?.message}>
                <input autoComplete="family-name" {...regUser("last_name", { required: "Indiquez votre nom", validate: (v) => v.trim().length >= 2 || "2 caractères minimum" })} />
              </Field>
            </div>
            <Field label="Téléphone" optional error={userErrors.phone?.message}>
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder={PHONE_PLACEHOLDER} {...regUser("phone", { validate: (v) => !v?.trim() || /^\+?[\d\s.()-]{8,20}$/.test(v.trim()) || "Numéro invalide" })} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Pays">
                <select autoComplete="country" {...regUser("country")}>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Ville" optional>
                <input autoComplete="address-level2" {...regUser("city")} />
              </Field>
            </div>
            <SubmitButton loading={updateUserMutation.isPending} loadingText="Enregistrement…" icon={Save} className="btn-primary w-full sm:w-auto">
              Enregistrer
            </SubmitButton>
          </form>
        </div>
      )}

      {/* Pro tab */}
      {activeTab === "pro" && isPro && (
        <form onSubmit={handlePro((data) => updateProMutation.mutate({ ...data, competence_domains: selectedDomains, trades: selectedTrades, skills }))} className="space-y-6">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Présentation</h2>
            <Field label="Bio professionnelle" hint="Présentez votre expertise et vos réalisations : c'est ce que les clients lisent en premier.">
              <textarea rows={5} placeholder="Décrivez votre expertise, vos réalisations…" {...regPro("bio")} />
            </Field>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Expérience (années)" error={proErrors.years_experience?.message}>
                <input type="number" inputMode="numeric" min={0} max={60} {...regPro("years_experience", { min: { value: 0, message: "Valeur positive" }, max: { value: 60, message: "60 ans maximum" } })} />
              </Field>
              <Field label="Tarif horaire (€)" error={proErrors.hourly_rate?.message}>
                <input type="number" inputMode="decimal" min={0} {...regPro("hourly_rate", { min: { value: 0, message: "Valeur positive" } })} />
              </Field>
              <Field label="Tarif forfaitaire (€)" error={proErrors.fixed_rate?.message}>
                <input type="number" inputMode="decimal" min={0} {...regPro("fixed_rate", { min: { value: 0, message: "Valeur positive" } })} />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="LinkedIn" optional error={proErrors.linkedin_url?.message}>
                <input type="url" inputMode="url" placeholder="https://linkedin.com/in/…" {...regPro("linkedin_url", { validate: (v) => !v || /^https?:\/\/\S+\.\S+/.test(v) || "Adresse web invalide (commence par https://)" })} />
              </Field>
              <Field label="Site web" optional error={proErrors.website_url?.message}>
                <input type="url" inputMode="url" placeholder="https://monsite.fr" {...regPro("website_url", { validate: (v) => !v || /^https?:\/\/\S+\.\S+/.test(v) || "Adresse web invalide (commence par https://)" })} />
              </Field>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Domaines de compétences</h2>
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map((d) => (
                <button key={d} type="button" onClick={() => toggleDomain(d)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${selectedDomains.includes(d) ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-700 border-gray-300 hover:border-primary-400"}`}>{d}</button>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="font-semibold text-gray-900">Mes métiers</h2>
              <span className="text-xs text-gray-500">{selectedTrades.length} / {MAX_TRADES}</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Les clients vous trouvent par métier. {selectedDomains.length > 0 ? "Liste filtrée selon vos domaines." : "Choisissez d'abord vos domaines pour filtrer la liste."}
            </p>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {tradeGroups.map((g) => (
                <div key={g.domain}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{g.domain}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.trades.map((t) => (
                      <button key={t.id} type="button" onClick={() => toggleTrade(t.name)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${selectedTrades.includes(t.name) ? "bg-accent-500 text-white border-accent-500" : "bg-white text-gray-700 border-gray-300 hover:border-accent-400"}`}>{t.name}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Compétences techniques</h2>
            <div className="flex gap-2 mb-3">
              <input className="input-field" placeholder="Ex: Python, React, AutoCAD..." value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} />
              <button type="button" onClick={addSkill} className="btn-primary px-4"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  {s}
                  <button type="button" onClick={() => setSkills((p) => p.filter((x) => x !== s))} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>

          <button type="submit" disabled={updateProMutation.isPending} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" /> {updateProMutation.isPending ? "Enregistrement..." : "Sauvegarder le profil"}
          </button>
        </form>
      )}

      {/* Documents tab */}
      {activeTab === "docs" && isPro && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Mes documents</h2>
          <p className="text-sm text-gray-500 mb-4">Ils restent privés : seule l'équipe ProServices les consulte pour vérifier votre profil.</p>
          <div className="space-y-3">
            {!documents?.length && <p className="text-sm text-gray-400">Aucun document pour l'instant.</p>}
            {documents?.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <button type="button" onClick={() => openPrivateDocument(doc.id).catch((e) => toast.error(apiError(e)))} className="font-medium text-gray-900 hover:text-primary-700 hover:underline truncate block max-w-full text-left">
                    {doc.name}
                  </button>
                  <p className="text-sm text-gray-500">{DOC_TYPES[doc.type] || doc.type}</p>
                  {doc.validation_status === "REJECTED" && doc.rejection_reason && (
                    <p className="text-xs text-red-600 mt-1">Motif du rejet : {doc.rejection_reason}</p>
                  )}
                </div>
                <span className={`badge ${doc.validation_status === "APPROVED" ? "badge-green" : doc.validation_status === "REJECTED" ? "badge-red" : "badge-yellow"}`}>
                  {doc.validation_status === "APPROVED" ? "Approuvé" : doc.validation_status === "REJECTED" ? "Rejeté" : "En attente"}
                </span>
                <button
                  type="button"
                  title="Supprimer"
                  onClick={async () => {
                    if (!window.confirm(`Supprimer « ${doc.name} » ?`)) return;
                    try {
                      await documentsAPI.delete(doc.id);
                      queryClient.invalidateQueries({ queryKey: ["my-documents"] });
                      toast.success("Document supprimé");
                    } catch (e) { toast.error(apiError(e)); }
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 p-5 border-2 border-dashed border-gray-300 rounded-xl text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-3">Ajoutez un document (PDF, JPG ou PNG, 10 Mo maximum)</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
              <select className="input-field w-auto" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {Object.entries(DOC_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <label className={`btn-primary cursor-pointer inline-block ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                {uploading ? "Envoi..." : "Choisir un fichier"}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={async (e) => {
                  const file = e.target.files[0];
                  e.target.value = "";
                  if (!file) return;
                  if (file.size > 10 * 1024 * 1024) { toast.error("Fichier trop volumineux (10 Mo maximum)"); return; }
                  const fd = new FormData();
                  fd.append("file", file);
                  fd.append("doc_type", docType);
                  fd.append("name", file.name);
                  setUploading(true);
                  try {
                    await documentsAPI.upload(fd);
                    toast.success("Document envoyé, en attente de validation");
                    queryClient.invalidateQueries({ queryKey: ["my-documents"] });
                  } catch (err) { toast.error(apiError(err)); }
                  finally { setUploading(false); }
                }} />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
