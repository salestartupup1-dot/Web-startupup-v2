// Commit public content and its invalidation marker together. A successful save
// must never leave visitors on an old version because a second write failed.
import { hasScopedVersions, PUBLIC_SECTIONS, sectionForPath } from './publicDataVersion.js';

export function createPublicDataWrites({ db, appId, doc, writeBatch, runTransaction, serverTimestamp, sdk }) {
  const prefix = `artifacts/${appId}/public/data/`;
  const versionRef = doc(db, `${prefix}site_settings/public_version`);
  const isPublic = ref => ref.path.startsWith(prefix) &&
    /^(properties\/[^/]+|company_info\/main|site_settings\/(visual|popup|sale_promotion))$/.test(ref.path.slice(prefix.length));
  const commit = async (method, ref, args) => {
    if (runTransaction) {
      return runTransaction(db, async tx => {
        const previous = (await tx.get(versionRef)).data();
        const stamp = serverTimestamp();
        const sections = hasScopedVersions(previous) ? { ...previous.sections }
          : Object.fromEntries(PUBLIC_SECTIONS.map(section => [section, stamp]));
        sections[sectionForPath(ref.path.slice(prefix.length))] = stamp;
        tx[method](ref, ...args);
        tx.set(versionRef, { updatedAt: stamp, scopedAt: stamp, sections }, { merge: true });
      });
    }
    // Compatibility for older integrations: global invalidation stays safe.
    const batch = writeBatch(db);
    batch[method](ref, ...args);
    batch.set(versionRef, {
      updatedAt: serverTimestamp(),
    }, { merge: true });
    await batch.commit();
  };
  return {
    setDoc: (ref, ...args) => isPublic(ref) ? commit('set', ref, args) : sdk.setDoc(ref, ...args),
    updateDoc: (ref, ...args) => isPublic(ref) ? commit('update', ref, args) : sdk.updateDoc(ref, ...args),
    deleteDoc: ref => isPublic(ref) ? commit('delete', ref, []) : sdk.deleteDoc(ref),
    addDoc: async (collection, data) => {
      const ref = doc(collection);
      if (!isPublic(ref)) return sdk.addDoc(collection, data);
      await commit('set', ref, [data]);
      return ref;
    },
  };
}
