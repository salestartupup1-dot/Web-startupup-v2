import { respondError } from '../../../lib/lineServer';
import { requireCrmLeadSourceMember } from '../../../lib/lineCrmAuth';
import { listPhoneClicks } from '../../../lib/phoneClickServer';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end(); }
  try {
    await requireCrmLeadSourceMember(req.headers.authorization);
    return res.json(await listPhoneClicks(req.query));
  } catch (error) { return respondError(res, error); }
}
