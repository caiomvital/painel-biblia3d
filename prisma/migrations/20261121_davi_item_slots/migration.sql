-- Itens vestíveis do Davi: novos encaixes no catálogo de cosméticos (só adiciona valores, nada é apagado).
ALTER TYPE "ItemSlot" ADD VALUE IF NOT EXISTS 'DAVI_HEAD';
ALTER TYPE "ItemSlot" ADD VALUE IF NOT EXISTS 'DAVI_TUNIC';
ALTER TYPE "ItemSlot" ADD VALUE IF NOT EXISTS 'DAVI_BOOTS';
ALTER TYPE "ItemSlot" ADD VALUE IF NOT EXISTS 'DAVI_WRISTS';
