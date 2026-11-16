// Coleção e visual do Lofi. O servidor é a autoridade: só equipa o que está no inventário do aluno.
import { prisma } from '@/lib/prisma';
import { ensureCatalog } from '@/lib/chest-service';
import { RARITY_LABEL } from '@/lib/cosmetics';
import { parseLook, sanitizeLookInput } from '@/lib/mascot-look';

export type CollectionItem =
  | { owned: true; code: string; name: string; slot: string; rarity: string; rarityLabel: string }
  /** Item que falta: só o encaixe (silhueta). Sem nome, código nem raridade, para não revelar a tabela de chances. */
  | { owned: false; slot: string };

export async function getCollection(studentId: string) {
  await ensureCatalog();
  const [items, owned, student] = await Promise.all([
    prisma.cosmeticItem.findMany({ where: { active: true }, orderBy: [{ slot: 'asc' }, { code: 'asc' }] }),
    prisma.studentItem.findMany({ where: { studentId }, select: { itemId: true } }),
    prisma.student.findUnique({ where: { id: studentId }, select: { mascotLook: true } }),
  ]);
  const have = new Set(owned.map((o) => o.itemId));
  const list: CollectionItem[] = items.map((i) =>
    have.has(i.id)
      ? { owned: true as const, code: i.code, name: i.name, slot: i.slot, rarity: i.rarity, rarityLabel: RARITY_LABEL[i.rarity] }
      : { owned: false as const, slot: i.slot },
  );
  return { items: list, total: items.length, ownedCount: have.size, look: parseLook(student?.mascotLook) };
}

export async function saveLook(studentId: string, input: unknown) {
  const owned = await prisma.studentItem.findMany({ where: { studentId }, select: { item: { select: { code: true } } } });
  const result = sanitizeLookInput(input, new Set(owned.map((o) => o.item.code)));
  if (!result.ok) throw new Error(result.error);
  await prisma.student.update({ where: { id: studentId }, data: { mascotLook: result.look as object } });
  return { look: result.look };
}
