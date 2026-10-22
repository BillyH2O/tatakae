import { PRODUCT } from '../../config/product';
import type { SqlDb } from '../../db/SqlDb';

/**
 * Crystal wallet, read-only. Balance = initial balance + Σ transactions; there is no earning rule
 * and no shop (PRODUCT_SPEC §3).
 */
export async function getCrystalBalance(db: SqlDb): Promise<number> {
  const row = await db.get<{ total: number }>(
    `SELECT COALESCE(SUM(t.amount), 0) AS total
     FROM wallet_transactions t
     JOIN wallets w ON w.id = t.wallet_id
     WHERE w.currency = 'crystal'`,
  );
  return PRODUCT.crystals.initialBalance + (row?.total ?? 0);
}
