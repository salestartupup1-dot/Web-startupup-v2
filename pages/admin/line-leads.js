export default function LegacyLeadSource() { return null; }

export async function getServerSideProps({ res }) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return { redirect: { destination: 'https://startup-up-crm.vercel.app/lead-source', permanent: false } };
}
