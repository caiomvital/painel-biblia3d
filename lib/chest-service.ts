// Baús: concessão (nível, sequência, atitudes) e abertura. O servidor é a autoridade: sorteio e inventário aqui.
import { randomInt } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { brazilDay } from '@/lib/kids-service';
import { levelFromXp } from '@/lib/level';
import { QUIZ_BLOCK } from '@/lib/quiz-points';
import { COSMETICS, RARITY_LABEL, type RarityName, type SlotName } from '@/lib/cosmetics';
import {
  DUPLICATE_COINS, addDays, attitudeChestRefs, describeChest, lessonChestRefs, levelChestRefs, quizChestRefs, milestoneHit, nextStreak, pickItem, pickRarity,
  streakChestRef, streakStartDay,
} from '@/lib/chests';

const rand = () => randomInt(0, 1_000_000) / 1_000_000;

let catalogReady: Promise<void> | null = null;
/** Garante o catálogo inicial (upsert por code; não mexe em itens já existentes além do nome/raridade/slot). */
export function ensureCatalog(): Promise<void> {
  if (!catalogReady) {
    catalogReady = (async () => {
      for (const c of COSMETICS) {
        await prisma.cosmeticItem.upsert({
          where: { code: c.code },
          create: { code: c.code, name: c.name, slot: c.slot, rarity: c.rarity },
          update: { name: c.name, slot: c.slot, rarity: c.rarity },
        });
      }
    })().catch((e) => { catalogReady = null; throw e; });
  }
  return catalogReady;
}

async function createChests(studentId: string, refs: string[]) {
  if (refs.length === 0) return;
  await prisma.chest.createMany({ data: refs.map((originReference) => ({ studentId, originReference })), skipDuplicates: true });
}

/**
 * Atualiza a sequência de dias seguidos no painel (dias de Recife) e concede o baú do marco, se for o caso.
 * Chamada no login do aluno; várias chamadas no mesmo dia não mudam nada.
 */
export async function touchStreak(studentId: string): Promise<{ current: number }> {
  const today = brazilDay();
  const row = await prisma.streak.findUnique({ where: { studentId } });
  const prev = { current: row?.currentStreak ?? 0, max: row?.maxStreak ?? 0, lastDay: row?.lastAttendedDate ? brazilDay(row.lastAttendedDate) : null };
  const next = nextStreak(prev, today);
  if (!next.changed) return { current: prev.current };
  const lastAttendedDate = new Date(`${today}T12:00:00Z`);
  if (!row) {
    try {
      await prisma.streak.create({ data: { studentId, currentStreak: next.current, maxStreak: next.max, lastAttendedDate } });
    } catch (error: any) {
      if (error?.code === 'P2002') return { current: prev.current }; // outro login do mesmo aluno chegou antes
      throw error;
    }
  } else {
    // só o primeiro dos logins simultâneos atualiza (o outro vê que a data mudou)
    const upd = await prisma.streak.updateMany({
      where: { id: row.id, lastAttendedDate: row.lastAttendedDate },
      data: { currentStreak: next.current, maxStreak: next.max, lastAttendedDate },
    });
    if (upd.count === 0) return { current: prev.current };
  }
  const hit = milestoneHit(next.current);
  if (hit) await createChests(studentId, [streakChestRef(hit, streakStartDay(today, next.current))]);
  return { current: next.current };
}

/** Concede (idempotente) os baús devidos por nível, atitudes, Desafios concluídos e registros do "O que aprendi". */
export async function grantChests(studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { currentXp: true } });
  if (!student) return;
  const [positives, quizDays, lessons] = await Promise.all([
    prisma.attitude.count({ where: { studentId, kind: 'POSITIVE' } }),
    prisma.quizDay.findMany({ where: { studentId, completedAt: { not: null } }, select: { answers: true } }),
    prisma.lessonCheck.count({ where: { studentId } }),
  ]);
  await createChests(studentId, [
    ...levelChestRefs(levelFromXp(student.currentXp)), ...attitudeChestRefs(positives), ...quizChestRefs(quizDays.filter((d) => Array.isArray(d.answers) && d.answers.length >= QUIZ_BLOCK).length), // só conta desafio com pelo menos 5 respostas
    ...lessonChestRefs(lessons),
  ]);
}

export async function closedChests(studentId: string) {
  await grantChests(studentId);
  const rows = await prisma.chest.findMany({
    where: { studentId, openedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, originReference: true },
  });
  return rows.map((r) => ({ id: r.id, ...describeChest(r.originReference) }));
}

export interface OpenResult {
  item: { code: string; name: string; slot: SlotName; rarity: RarityName; rarityLabel: string };
  isNew: boolean;
  duplicateCoins: number;
}

/**
 * Abre o baú: tudo numa transação. O baú só abre uma vez (update condicional openedAt IS NULL);
 * o sorteio e a gravação no inventário acontecem aqui. Repetido vira bônus de fichas (sem XP).
 */
export async function openChest(studentId: string, chestId: unknown): Promise<OpenResult> {
  if (typeof chestId !== 'string' || !chestId) throw new Error('Baú inválido.');
  await ensureCatalog();
  const items = await prisma.cosmeticItem.findMany({ where: { active: true } });
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.chest.updateMany({ where: { id: chestId, studentId, openedAt: null }, data: { openedAt: new Date() } });
    if (claimed.count === 0) throw new Error('Este baú não está disponível.');
    const rarity = pickRarity(rand);
    const item = pickItem(items, rarity, rand);
    if (!item) throw new Error('Nenhum item disponível agora. Tente mais tarde.');
    const owned = await tx.studentItem.findUnique({ where: { studentId_itemId: { studentId, itemId: item.id } } });
    let duplicateCoins = 0;
    if (!owned) {
      await tx.studentItem.create({ data: { studentId, itemId: item.id } });
    } else {
      duplicateCoins = DUPLICATE_COINS[item.rarity];
      await tx.coinTransaction.create({
        data: { studentId, amount: duplicateCoins, type: 'EARNED', description: `Item repetido: ${item.name}`, originReference: `CHEST_DUP_${chestId}` },
      });
      await tx.student.update({ where: { id: studentId }, data: { coinBalance: { increment: duplicateCoins } } });
    }
    await tx.chest.update({ where: { id: chestId }, data: { itemId: item.id, duplicateCoins: owned ? duplicateCoins : null } });
    return {
      item: { code: item.code, name: item.name, slot: item.slot, rarity: item.rarity, rarityLabel: RARITY_LABEL[item.rarity] },
      isNew: !owned,
      duplicateCoins,
    };
  });
}

export { addDays };
