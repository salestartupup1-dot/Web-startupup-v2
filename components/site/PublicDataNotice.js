export default function PublicDataNotice() {
  return (
    <div role="alert" style={{ position: 'fixed', top: 80, left: 16, right: 16, zIndex: 150,
      padding: 16, borderRadius: 12, background: '#fff7ed', color: '#7c2d12', textAlign: 'center' }}>
      ยังตรวจสอบข้อมูลและราคาล่าสุดไม่ได้ กรุณาลองโหลดใหม่
      <button type="button" onClick={() => window.location.reload()}
        style={{ marginLeft: 12, minHeight: 44, padding: '8px 16px', textDecoration: 'underline' }}>
        โหลดใหม่
      </button>
    </div>
  );
}
