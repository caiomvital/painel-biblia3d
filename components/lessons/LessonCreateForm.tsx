"use client";
import { useState, type FormEvent } from "react";

type ClassOption = { id: string; name: string; scheduleTime: string; status?: string };
export function LessonCreateForm({ classes, selectedClassId = "", onCreated, buttonClass, fieldClass }: { classes: ClassOption[]; selectedClassId?: string; onCreated: () => Promise<void>; buttonClass: string; fieldClass: string }) {
  const [classId, setClassId] = useState(selectedClassId);
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [plannedContent, setPlannedContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/lessons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId, date, title, plannedContent }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível cadastrar a aula.");
      setTitle(""); setPlannedContent(""); setMessage("Aula cadastrada."); await onCreated();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Erro de conexão."); }
    finally { setBusy(false); }
  }
  const availableClasses = classes.filter((item) => item.status !== "FINISHED");
  return <form onSubmit={submit} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3" aria-label="Cadastrar aula individual">
    <h3 className="font-semibold">Cadastrar aula</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      <label>Turma<select required className={fieldClass} value={classId} onChange={(e) => setClassId(e.target.value)}><option value="">Selecione uma turma</option>{availableClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Data<input required type="date" className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label className="sm:col-span-2">Título<input required maxLength={120} className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Introdução à lógica" /></label>
      <label className="sm:col-span-2">Conteúdo planejado (opcional)<textarea className={fieldClass} rows={2} value={plannedContent} onChange={(e) => setPlannedContent(e.target.value)} /></label>
    </div>
    {message && <p role="status" className="text-sm text-amber-200">{message}</p>}
    <button className={buttonClass} disabled={busy || !availableClasses.length}>{busy ? "Salvando…" : "Cadastrar aula"}</button>
  </form>;
}
