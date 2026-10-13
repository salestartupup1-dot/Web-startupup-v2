import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { highlightDb } from '../lib/highlightFirebase';
import { effectiveHighlights, highlightId, highlightLines, hasHighlights, MAX_HIGHLIGHTS, nextHighlight } from '../lib/highlights.mjs';
import { useHighlightAuth } from './HighlightAuth';

export default function HouseHighlights({ house, onResize, onStatusChange }) {
  const { user, canEdit, login, busy: loginBusy, error: authError } = useHighlightAuth();
  const [id, setId] = useState(null), [override, setOverride] = useState(null), [ready, setReady] = useState(false);
  const [website, setWebsite] = useState(null), [websiteError, setWebsiteError] = useState('');
  const [editing, setEditing] = useState(false), [text, setText] = useState(''), [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const textarea = useRef(null), editButton = useRef(null);
  useEffect(() => {
    let active = true, unsubscribe;
    highlightId(house).then(key => {
      if (!active) return; setId(key);
      if (!key) { setError('ต้องมีชื่อโครงการและบ้านเลขที่ก่อนแก้ไขจุดเด่น'); return; }
      unsubscribe = onSnapshot(doc(highlightDb, 'stock_map_highlights', key), snapshot => {
        setOverride(snapshot.exists() ? snapshot.data() : null); setReady(true);
      }, () => { setReady(false); setError('โหลดจุดเด่นที่บันทึกไว้ไม่สำเร็จ กรุณาปิดแล้วเปิดบ้านนี้ใหม่'); });
    });
    const controller = new AbortController();
    fetch(`/api/website-highlights?${new URLSearchParams({ project: house.project, number: house.houseNumber })}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(); return response.json();
    }).then(data => { if (active) { setWebsite(data); if (data.stale) setWebsiteError('เว็บหลักไม่พร้อม ใช้ข้อมูลล่าสุดที่มี'); } })
      .catch(e => { if (active && e.name !== 'AbortError') setWebsiteError('โหลดจุดเด่นจากเว็บหลักไม่ได้ ยังสามารถกรอกจุดเด่นเองได้'); });
    return () => { active = false; unsubscribe?.(); controller.abort(); };
  }, [house]);
  useEffect(() => { onResize?.(); }, [ready, override, website, editing, error, notice, onResize]);
  useEffect(() => { if (editing) textarea.current?.focus(); }, [editing]);
  useEffect(() => {
    if (ready && (override?.mode === 'custom' || (website && !website.stale))) {
      onStatusChange?.(house, hasHighlights(override, website?.highlights));
    }
  }, [ready, override, website, house, onStatusChange]);
  const currentText = effectiveHighlights(override, website?.highlights);
  const lines = highlightLines(currentText);
  const beginEdit = () => { setText(currentText); setRevision(override?.revision || 0); setError(''); setNotice(''); setEditing(true); };
  const closeEdit = () => { setEditing(false); setTimeout(() => editButton.current?.focus(), 0); };
  const save = async mode => {
    if (!canEdit || !ready || busy || !id) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const reference = doc(highlightDb, 'stock_map_highlights', id);
      await runTransaction(highlightDb, async transaction => {
        const existing = await transaction.get(reference);
        transaction.set(reference, nextHighlight(existing.data(), revision, house, mode, text, serverTimestamp()));
      });
      closeEdit(); setNotice(mode === 'website' ? 'กลับไปใช้จุดเด่นจากเว็บหลักแล้ว' : 'บันทึกจุดเด่นแล้ว');
    } catch (e) { setError(e.code === 'permission-denied' ? 'บัญชีนี้ไม่มีสิทธิ์บันทึก กรุณาเข้าสู่ระบบใหม่' : e.message?.includes('อีกเครื่อง') ? e.message : 'บันทึกไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่ ข้อความยังอยู่ในช่องกรอก'); }
    finally { setBusy(false); }
  };
  return <section className="house-highlights" aria-label="จุดเด่นของบ้าน" onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
    <div className="highlights-title"><h3>จุดเด่นของบ้าน</h3>{ready && canEdit && !editing && <button ref={editButton} onClick={beginEdit}>แก้ไขจุดเด่น</button>}</div>
    {!ready ? <p role="status">{error || 'กำลังโหลดจุดเด่น…'}</p> : editing ? <form onSubmit={e => { e.preventDefault(); save('custom'); }}>
      <label htmlFor={`highlights-${id}`}>จุดเด่น (แยกแต่ละข้อด้วยการขึ้นบรรทัดใหม่)</label>
      <textarea ref={textarea} id={`highlights-${id}`} value={text} onChange={e => setText(e.target.value)} maxLength={MAX_HIGHLIGHTS} rows={5} disabled={busy || !canEdit} aria-describedby={`highlight-help-${id}`} />
      <p id={`highlight-help-${id}`}>{text.length.toLocaleString('th-TH')} / 4,000 ตัวอักษร · ใช้เฉพาะแผนที่</p>
      <div className="highlight-actions"><button type="button" onClick={() => save('custom')} disabled={busy || !canEdit} className="highlight-save">{busy ? 'กำลังบันทึก…' : 'บันทึก'}</button><button type="button" disabled={busy} onClick={closeEdit}>ยกเลิก</button></div>
      {override?.mode === 'custom' && <button className="highlight-reset" type="button" disabled={busy || !canEdit} onClick={() => save('website')}>กลับไปใช้ข้อมูลจากเว็บหลัก</button>}
    </form> : <>
      {lines.length ? <><ul>{lines.map((line, index) => <li key={index}>{line}</li>)}</ul><p className="highlight-source">{override?.mode === 'custom' ? 'ข้อมูลที่บันทึกในแผนที่' : 'ข้อมูลจากเว็บไซต์หลัก'}</p></> : <p>{override?.mode === 'custom' ? 'ยังไม่ได้ระบุจุดเด่นในแผนที่' : website || websiteError ? 'ยังไม่มีจุดเด่นจากเว็บไซต์หลัก' : 'กำลังโหลดจุดเด่นจากเว็บไซต์หลัก…'}</p>}
      {!user && <button onClick={login} disabled={loginBusy}>เข้าสู่ระบบเพื่อแก้ไขจุดเด่น</button>}
    </>}
    {website?.url && <a className="highlight-website" href={website.url} target="_blank" rel="noopener noreferrer">ดูรายละเอียดบ้านบนเว็บไซต์</a>}
    {websiteError && override?.mode !== 'custom' && <p role="status">{websiteError}</p>}
    {(error || authError) && <p role="alert" className="highlight-error">{error || authError}</p>}
    {notice && <p role="status" className="highlight-success">{notice}</p>}
  </section>;
}
