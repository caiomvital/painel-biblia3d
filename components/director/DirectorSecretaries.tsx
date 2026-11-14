"use client";
import { useEffect, useState, type FormEvent } from "react";
import { buttonClass, fieldClass } from "./director-ui";

type Secretary = { id: string; name: string; email: string };
export function DirectorSecretaries() {
  const [items, setItems] = useState<Secretary[]>([]);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function load() { const response = await fetch("/api/director/secretaries"); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível carregar as contas."); setItems(data.secretaries); }
  useEffect(() => { const controller = new AbortController(); fetch("/api/director/secretaries", { signal: controller.signal }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível carregar as contas."); return data.secretaries as Secretary[]; }).then(setItems).catch((error) => { if (!controller.signal.aborted) setMessage(error.message); }); return () => controller.abort(); }, []);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); try { const response = await fetch("/api/director/secretaries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, initialPassword: password }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível criar a conta."); setName(""); setEmail(""); setPassword(""); setMessage("Conta da secretaria criada."); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Erro de conexão."); } finally { setBusy(false); } }
  return <section className="space-y-4">
    <div><h2 className="text-lg font-bold">Perfil Secretaria</h2><p className="text-sm text-slate-400">A Secretaria aprova cadastros de alunos, cria turmas e matricula alunos em lote.</p></div>
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:grid-cols-2">
      <label>Nome<input required maxLength={120} className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>E-mail<input required type="email" className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Senha inicial (6 a 8 caracteres)<input required type="password" minLength={6} maxLength={8} className={fieldClass} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <div className="flex items-end"><button className={buttonClass} disabled={busy}>{busy ? "Criando…" : "Criar conta da Secretaria"}</button></div>
      {message && <p role="status" className="sm:col-span-2 text-sm text-amber-200">{message}</p>}
    </form>
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><h3 className="font-bold">Contas da Secretaria</h3>{items.length ? items.map((item) => <p key={item.id} className="mt-2 text-sm">{item.name} · {item.email}</p>) : <p className="mt-2 text-sm text-slate-400">Nenhuma conta cadastrada.</p>}</div>
  </section>;
}
