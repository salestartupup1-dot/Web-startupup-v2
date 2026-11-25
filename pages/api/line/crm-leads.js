import { listAcquisitions, listCustomerVisits } from '../../../lib/lineAcquisitionReport';
import { getLineConfig, listLeads, respondError } from '../../../lib/lineServer';
import { requireCrmLeadSourceMember } from '../../../lib/lineCrmAuth';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end(); }
  try {
    await requireCrmLeadSourceMember(req.headers.authorization);
    const { enabled, ready, webhookReady } = getLineConfig();
    if (req.query.mode === 'history') return res.json(await listCustomerVisits(req.query.userId));
    const report = ['acquisition', 'paid-acquisition'].includes(req.query.mode)
      ? await listAcquisitions(req.query) : await listLeads(req.query);
    return res.json({ ...report, setup: { enabled, ready, webhookReady } });
  } catch (error) { return respondError(res, error); }
}
