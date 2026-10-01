import { getLineConfig, listLeads, respondError } from '../../../lib/lineServer';
import { requireCrmLeadSourceMember } from '../../../lib/lineCrmAuth';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end(); }
  try {
    await requireCrmLeadSourceMember(req.headers.authorization);
    const { enabled, ready, webhookReady } = getLineConfig();
    return res.json({ ...await listLeads(req.query), setup: { enabled, ready, webhookReady } });
  } catch (error) { return respondError(res, error); }
}
