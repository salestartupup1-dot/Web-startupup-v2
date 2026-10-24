export default function ListingPagination({ page, totalPages, hrefForPage }) {
  if (totalPages <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  if (!pages.includes(1)) pages.unshift(1);
  if (!pages.includes(totalPages)) pages.push(totalPages);
  const style = 'min-w-10 h-10 px-2 rounded-full inline-flex items-center justify-center border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800';
  return <nav aria-label="แบ่งหน้ารายการ" className="flex flex-wrap justify-center items-center mt-16 gap-2 w-full">
    {page > 1 && <a href={hrefForPage(page - 1)} rel="prev" aria-label="หน้าก่อนหน้า" className={`${style} bg-white border-gray-200 text-brand-green`}>‹</a>}
    {pages.map(number => <a key={number} href={hrefForPage(number)} aria-label={`หน้า ${number}`} aria-current={page === number ? 'page' : undefined}
      className={`${style} ${page === number ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-green'}`}>{number}</a>)}
    {page < totalPages && <a href={hrefForPage(page + 1)} rel="next" aria-label="หน้าถัดไป" className={`${style} bg-white border-gray-200 text-brand-green`}>›</a>}
  </nav>;
}
