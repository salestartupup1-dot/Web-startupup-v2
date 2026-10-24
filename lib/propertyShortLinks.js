import { randomBytes } from 'node:crypto';

export const SHORT_CODES = 'website_short_codes_private';
export const SHORT_IDS = 'website_short_ids_private';
export const isShortCode = value => typeof value === 'string' && /^[a-f0-9]{6}$/.test(value);
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const failure = status => Object.assign(new Error('Short link unavailable'), { status });

export function createPropertyShortLinks({ database, makeCode = () => randomBytes(3).toString('hex') }) {
  const codes = new Map();
  const remember = (code, id) => { if (codes.size >= 512) codes.clear(); codes.set(code, id); };
  return {
    async create(id) {
      if (!validId(id)) throw failure(400);
      const db = await database();
      const idRef = db.collection(SHORT_IDS).doc(id);
      const houseRef = db.doc(`artifacts/startup-up-realestate/public/data/properties/${id}`);
      for (let attempt = 0; attempt < 12; attempt++) {
        const candidate = makeCode();
        if (!isShortCode(candidate)) throw failure(503);
        const code = await db.runTransaction(async tx => {
          const existing = (await tx.get(idRef)).data();
          if (existing) {
            if (!isShortCode(existing.code)) throw failure(503);
            return existing.code;
          }
          if (!(await tx.get(houseRef)).exists) throw failure(404);
          const codeRef = db.collection(SHORT_CODES).doc(candidate);
          if ((await tx.get(codeRef)).exists) return null;
          // Atomic, immutable, one-to-one reservation. Never reuse a deleted house's code.
          tx.create(codeRef, { propertyId: id });
          tx.create(idRef, { code: candidate });
          return candidate;
        });
        if (code) { remember(code, id); return `/${code}`; }
      }
      throw failure(503);
    },
    async resolve(code) {
      if (!isShortCode(code)) return null;
      if (codes.has(code)) return codes.get(code);
      const db = await database();
      const data = (await db.collection(SHORT_CODES).doc(code).get()).data();
      if (!data) return null;
      if (!validId(data.propertyId)) throw failure(503);
      remember(code, data.propertyId);
      return data.propertyId;
    },
  };
}

export const propertyShortLinks = createPropertyShortLinks({ database: async () => {
  const { leadDb } = await import('./lineServer.js');
  const db = leadDb();
  if (db.projectId !== 'startup-up-realestate') throw failure(503);
  return db;
} });
