/**
 * Visual equipado do Lofi (função pura, sem banco). O servidor só aceita itens do catálogo, do encaixe certo
 * e que o aluno já tem no inventário; qualquer outra coisa é recusada.
 */
import { COSMETICS, type SlotName } from './cosmetics';

export interface MascotLook {
  color?: string;
  accessory?: string;
  background?: string;
  frame?: string;
  /** Visual do Davi (tutor). */
  daviHead?: string;
  daviTunic?: string;
  daviBoots?: string;
  daviWrists?: string;
}

export const LOOK_KEYS = ['color', 'accessory', 'background', 'frame', 'daviHead', 'daviTunic', 'daviBoots', 'daviWrists'] as const;
export type LookKey = (typeof LOOK_KEYS)[number];

export const SLOT_OF_KEY: Record<LookKey, SlotName> = {
  color: 'COLOR',
  accessory: 'ACCESSORY',
  background: 'BACKGROUND',
  frame: 'FRAME',
  daviHead: 'DAVI_HEAD',
  daviTunic: 'DAVI_TUNIC',
  daviBoots: 'DAVI_BOOTS',
  daviWrists: 'DAVI_WRISTS',
};

export const LOFI_KEYS = ['color', 'accessory', 'background', 'frame'] as const;
export const DAVI_KEYS = ['daviHead', 'daviTunic', 'daviBoots', 'daviWrists'] as const;

const bySlot = (code: string, slot: SlotName) => COSMETICS.some((c) => c.code === code && c.slot === slot);

/** Lê o JSON salvo (ou qualquer coisa) e devolve só campos válidos do catálogo. Nunca lança. */
export function parseLook(raw: unknown): MascotLook {
  const out: MascotLook = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;
  for (const key of LOOK_KEYS) {
    const v = o[key];
    if (typeof v === 'string' && bySlot(v, SLOT_OF_KEY[key])) out[key] = v;
  }
  return out;
}

export type LookResult = { ok: true; look: MascotLook } | { ok: false; error: string };

/**
 * Valida o pedido do aluno. Campo ausente/null/"" = sem item nesse encaixe.
 * Só vale o que está em `ownedCodes` (inventário do aluno) e no encaixe certo.
 */
export function sanitizeLookInput(input: unknown, ownedCodes: ReadonlySet<string>): LookResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Visual inválido.' };
  const o = input as Record<string, unknown>;
  for (const k of Object.keys(o)) {
    if (!(LOOK_KEYS as readonly string[]).includes(k)) return { ok: false, error: 'Visual inválido.' };
  }
  const look: MascotLook = {};
  for (const key of LOOK_KEYS) {
    const v = o[key];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v !== 'string' || !bySlot(v, SLOT_OF_KEY[key])) return { ok: false, error: 'Esse item não serve aqui.' };
    if (!ownedCodes.has(v)) return { ok: false, error: 'Você ainda não conquistou esse item.' };
    look[key] = v;
  }
  return { ok: true, look };
}
