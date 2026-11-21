import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Wallet as WalletIcon, Plus, Send, ArrowDownLeft, ArrowUpRight, Smartphone, CreditCard, Check, AtSign, Phone, StickyNote } from "lucide-react";
import { walletAPI } from "../services/api";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import { Field, SubmitButton, FormAlert } from "../components/common/Form";
import { apiError } from "../constants/locale";

const TYPE_CONFIG = {
  TOPUP: { label: "Rechargement", icon: ArrowDownLeft, style: "text-green-600 bg-green-50" },
  TRANSFER_IN: { label: "Reçu", icon: ArrowDownLeft, style: "text-green-600 bg-green-50" },
  TRANSFER_OUT: { label: "Envoyé", icon: ArrowUpRight, style: "text-red-600 bg-red-50" },
  MISSION_PAYOUT: { label: "Paiement de mission reçu", icon: ArrowDownLeft, style: "text-green-600 bg-green-50" },
  MISSION_REFUND: { label: "Remboursement", icon: ArrowDownLeft, style: "text-green-600 bg-green-50" },
  MISSION_PAYMENT: { label: "Mission payée", icon: ArrowUpRight, style: "text-red-600 bg-red-50" },
};
const DEBITS = ["TRANSFER_OUT", "MISSION_PAYMENT"];

export default function Wallet() {
  const queryClient = useQueryClient();
  const [topupModal, setTopupModal] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [topupError, setTopupError] = useState("");
  const [transferError, setTransferError] = useState("");
  const topupForm = useForm({ mode: "onTouched", defaultValues: { amount: "", payment_method: "CARD", phone_number: "" } });
  const transferForm = useForm({ mode: "onTouched", defaultValues: { recipient: "", amount: "", note: "" } });
  const paymentMethod = topupForm.watch("payment_method");
  const topupAmount = topupForm.watch("amount");
  const openTopup = () => { topupForm.reset(); setTopupError(""); setTopupModal(true); };
  const openTransfer = () => { transferForm.reset(); setTransferError(""); setTransferModal(true); };

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletAPI.getMine().then((r) => r.data),
  });

  const { data: txns, isLoading: txnsLoading } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: () => walletAPI.getTransactions({ page: 1, size: 20 }).then((r) => r.data),
  });

  const topupMutation = useMutation({
    mutationFn: (data) => walletAPI.topup(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["wallet"]);
      queryClient.invalidateQueries(["wallet-transactions"]);
      toast.success("Portefeuille rechargé avec succès");
      setTopupModal(false);
    },
    onError: (err) => setTopupError(apiError(err, "Le rechargement a échoué, réessayez dans un instant")),
  });

  const transferMutation = useMutation({
    mutationFn: (data) => walletAPI.transfer(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["wallet"]);
      queryClient.invalidateQueries(["wallet-transactions"]);
      toast.success("Transfert effectué avec succès");
      setTransferModal(false);
    },
    onError: (err) => setTransferError(apiError(err, "Le transfert a échoué, réessayez dans un instant")),
  });

  if (walletLoading) return <Loader />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon portefeuille</h1>

      {/* Balance card */}
      <div className="bg-hero-gradient rounded-3xl p-8 text-white mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-primary-100">
            <WalletIcon className="w-5 h-5" /> Solde disponible
          </div>
          <span className="text-xs bg-white/15 rounded-full px-3 py-1">ProServices Cash</span>
        </div>
        <div className="text-4xl font-bold mb-8">{(wallet?.balance || 0).toLocaleString("fr-FR")} <span className="text-lg font-normal text-primary-100">€</span></div>
        <div className="flex gap-3">
          <button onClick={openTopup} className="flex-1 bg-white text-primary-700 hover:bg-gray-100 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Recharger
          </button>
          <button onClick={openTransfer} className="flex-1 bg-white/10 hover:bg-white/20 border border-white/30 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> Transférer
          </button>
        </div>
      </div>

      {/* Transaction history */}
      <div className="card">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Historique des transactions</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {txnsLoading ? <div className="p-8"><Loader /></div> : txns?.items?.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Aucune transaction pour l'instant</div>
          ) : (
            txns?.items?.map((t) => {
              const conf = TYPE_CONFIG[t.type] || TYPE_CONFIG.TOPUP;
              const TIcon = conf.icon;
              const isCredit = !DEBITS.includes(t.type);
              return (
                <div key={t.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${conf.style}`}>
                      <TIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{conf.label}</p>
                      <p className="text-xs text-gray-500 truncate">{t.note}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-semibold ${isCredit ? "text-green-600" : "text-red-600"}`}>{isCredit ? "+" : "-"}{Math.abs(t.amount).toLocaleString("fr-FR")} €</p>
                    <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Rechargement */}
      <Modal isOpen={topupModal} onClose={() => setTopupModal(false)} title="Recharger mon portefeuille">
        <form noValidate className="space-y-5" onSubmit={topupForm.handleSubmit((d) => {
          setTopupError("");
          topupMutation.mutate({ amount: Number(d.amount), payment_method: d.payment_method, phone_number: d.payment_method === "CARD" ? undefined : d.phone_number.trim() });
        })}>
          <FormAlert>{topupError}</FormAlert>
          <div>
            <Field label="Montant (€)" required error={topupForm.formState.errors.amount?.message}>
              <input type="number" inputMode="decimal" min={1} step="0.01" placeholder="50" className="input-field !text-lg font-semibold" {...topupForm.register("amount", {
                required: "Indiquez un montant",
                min: { value: 1, message: "Minimum 1 €" },
                max: { value: 10000, message: "Maximum 10 000 € par rechargement" },
              })} />
            </Field>
            <div className="flex flex-wrap gap-2 mt-2.5">
              {[20, 50, 100, 200].map((v) => (
                <button key={v} type="button" onClick={() => topupForm.setValue("amount", String(v), { shouldValidate: true })}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all ${Number(topupAmount) === v ? "bg-primary-600 border-primary-600 text-white" : "border-gray-200 text-gray-700 hover:border-primary-300 hover:text-primary-700"}`}>
                  {v} €
                </button>
              ))}
            </div>
          </div>
          <fieldset>
            <legend className="form-label">Mode de paiement</legend>
            <div className="grid sm:grid-cols-3 gap-2.5">
              {[["CARD", "Carte bancaire", "bg-primary-50 text-primary-600", CreditCard], ["MTN_MOMO", "MTN MoMo", "bg-yellow-50 text-yellow-600", Smartphone], ["ORANGE_MONEY", "Orange Money", "bg-orange-50 text-orange-600", Smartphone]].map(([val, label, color, Icon]) => {
                const active = paymentMethod === val;
                return (
                  <label key={val} className={`relative cursor-pointer rounded-2xl border-2 p-3 sm:p-4 flex sm:flex-col items-center gap-3 sm:gap-2 sm:text-center transition-all focus-within:ring-4 focus-within:ring-primary-500/15 ${active ? "border-primary-500 bg-primary-50/60" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" value={val} className="sr-only" {...topupForm.register("payment_method")} />
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></span>
                    <span className="text-sm font-semibold text-gray-800">{label}</span>
                    {active && <span className="ml-auto sm:absolute sm:top-2 sm:right-2 w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center"><Check className="w-3 h-3" strokeWidth={3} /></span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
          {paymentMethod !== "CARD" && (
            <Field label="Numéro Mobile Money" required icon={Phone} error={topupForm.formState.errors.phone_number?.message}>
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+237 6 77 00 00 00" {...topupForm.register("phone_number", {
                validate: (v) => topupForm.getValues("payment_method") === "CARD" || /^\+?[\d\s.()-]{8,20}$/.test(v.trim()) || "Saisissez un numéro valide",
              })} />
            </Field>
          )}
          <SubmitButton loading={topupMutation.isPending} loadingText="Traitement…" icon={Plus} className="btn-primary w-full text-base">
            Recharger{Number(topupAmount) > 0 ? ` ${Number(topupAmount).toLocaleString("fr-FR")} €` : ""}
          </SubmitButton>
        </form>
      </Modal>

      {/* Transfert */}
      <Modal isOpen={transferModal} onClose={() => setTransferModal(false)} title="Transférer des fonds">
        <form noValidate className="space-y-5" onSubmit={transferForm.handleSubmit((d) => {
          setTransferError("");
          transferMutation.mutate({ recipient: d.recipient.trim(), amount: Number(d.amount), note: d.note.trim() || undefined });
        })}>
          <FormAlert>{transferError}</FormAlert>
          <Field label="Destinataire" required icon={AtSign} hint="Email ou numéro de téléphone du compte ProServices." error={transferForm.formState.errors.recipient?.message}>
            <input autoComplete="off" placeholder="destinataire@exemple.fr" {...transferForm.register("recipient", {
              required: "Indiquez le destinataire",
              validate: (v) => v.trim().length >= 3 || "Destinataire trop court",
            })} />
          </Field>
          <Field label="Montant (€)" required error={transferForm.formState.errors.amount?.message} hint={`Solde disponible : ${(wallet?.balance || 0).toLocaleString("fr-FR")} €`}>
            <input type="number" inputMode="decimal" min={1} step="0.01" placeholder="20" className="input-field !text-lg font-semibold" {...transferForm.register("amount", {
              required: "Indiquez un montant",
              min: { value: 1, message: "Minimum 1 €" },
              validate: (v) => Number(v) <= (wallet?.balance || 0) || "Montant supérieur à votre solde",
            })} />
          </Field>
          <Field label="Note" optional icon={StickyNote} error={transferForm.formState.errors.note?.message}>
            <input maxLength={200} placeholder="Motif du transfert" {...transferForm.register("note", { maxLength: { value: 200, message: "200 caractères maximum" } })} />
          </Field>
          <SubmitButton loading={transferMutation.isPending} loadingText="Transfert…" icon={Send} className="btn-primary w-full text-base">
            Confirmer le transfert
          </SubmitButton>
        </form>
      </Modal>
    </div>
  );
}
