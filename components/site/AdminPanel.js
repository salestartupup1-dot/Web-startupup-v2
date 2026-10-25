import { auth, HOST_EMAIL, setDoc, updateDoc, addDoc, deleteDoc } from '../../lib/firebaseClient';
import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Home, X, Plus, Trash2, Users, Edit, ImageIcon, Layout, ChevronLeft, ChevronRight, ChevronDown, Upload, Briefcase, Loader, Check, Copy, AlertTriangle, LayoutTemplate } from 'lucide-react';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import PropertyEditorialFields from './PropertyEditorialFields';
import SalePromotionAdmin from './SalePromotionAdmin';
import { copyShortShareUrl } from '../../lib/propertyShareClient';
import { PROPERTY_OWNERS, DEFAULT_PROPERTY_OWNER } from '../../lib/propertyOwners';
import { getPropertyStockAlert } from '../../lib/stockMatching';
import { getPendingStockHouses, groupAdminStock } from '../../lib/adminStock';
import {
  DEFAULT_COMPANY_INFO, CATEGORIES, BADGES, DIRECTIONS, COMMON_FACILITIES,
  uploadFileToCloudinary, getOptimizedImg, SmartImage, validateImage,
} from './SiteApp';

/**
 * หลังบ้าน (AdminPanel) แยกไฟล์ออกจาก SiteApp เพื่อให้ลูกค้าไม่ต้องโหลดโค้ดหลังบ้านทั้งก้อน
 * SiteV4 โหลดไฟล์นี้แบบ dynamic เฉพาะตอนแอดมินเปิดหลังบ้าน เนื้อหาข้างล่างย้ายมาจาก SiteApp ตรงตัว
 */

const AdminLocationFields = dynamic(() => import('./AdminLocationFields'));


/**
 * เรียงไฟล์ที่เลือกมาตามชื่อ
 *
 * เบราว์เซอร์ไม่ได้คืนไฟล์ตามลำดับที่เห็นในโฟลเดอร์ มักเอาไฟล์ที่คลิกล่าสุดขึ้นก่อน
 * ถ้าอัปโหลดตามลำดับที่มันส่งมา รูปจะสลับที่กันทั้งที่เลือกมาเรียง ๆ
 *
 * numeric: true จำเป็นมาก ถ้าเรียงแบบตัวอักษรล้วน _10 จะมาก่อน _2
 * ซึ่งชื่อไฟล์รูปที่ถ่ายมาเป็นชุดมักลงท้ายด้วยเลขลำดับพอดี
 */
const FILE_NAME_ORDER = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
const sortFilesByName = (fileList) =>
  Array.from(fileList || []).sort((a, b) => FILE_NAME_ORDER.compare(a.name, b.name));

const MAX_PROPERTY_IMAGES = 15;
export default function AdminPanel({ userRole, userEmail, properties, users, companyInfo, popupData, locations, onClose, onLogout, db, appId, enterVisualEditMode, showAlert, showConfirm }) {
    const [panelTab, setPanelTab] = useState('properties'); 
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [collapsedOwners, setCollapsedOwners] = useState({});
    const [expandedOwners, setExpandedOwners] = useState({});
    const [copiedPropId, setCopiedPropId] = useState(null);
    const [stockIndex, setStockIndex] = useState(null);
    const [stockCheckError, setStockCheckError] = useState('');
    const [isStockRefreshing, setIsStockRefreshing] = useState(false);
    const [alertOnlyOwners, setAlertOnlyOwners] = useState({});
    const [expandedPendingGroups, setExpandedPendingGroups] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Uploading states
    const [isUploadingImgs, setIsUploadingImgs] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingPopup, setIsUploadingPopup] = useState(false);
    const [isUploadingPortfolio, setIsUploadingPortfolio] = useState({ state: false, year: null });

    // Forms
    const initialForm = { custom_id: '', project_name: '', property_owner: DEFAULT_PROPERTY_OWNER, category: 'ทาวน์เฮาส์', price: '', status: 'available', badge: '', house_number: '', soi: '', zipcode: '', subdistrict: '', district: '', province: '', area_wah: '', area_sqm: '', floors: '', bedrooms: '', bathrooms: '', parking: '', direction: '', lat: '', lng: '', highlights: '', facilitiesList: [], images: [], youtubeUrl: '', main_location: '', sub_location: '' };
    const [formData, setFormData] = useState(initialForm);
    const [imagesPreview, setImagesPreview] = useState([]);
    const [addressOptions, setAddressOptions] = useState([]);
    const [companyForm, setCompanyForm] = useState(companyInfo || DEFAULT_COMPANY_INFO);
    const [popupForm, setPopupForm] = useState(popupData || { imageUrl: '', isActive: false });
    
    const [newPortfolioYear, setNewPortfolioYear] = useState('');
    const [inviteEmail, setInviteEmail] = useState(''); const [inviteRole, setInviteRole] = useState('admin');
    const [newFacility, setNewFacility] = useState('');
    const [thaiAddressData, setThaiAddressData] = useState({ byZipcode: {}, tree: {} });

    const checkAccess = (requiredRole) => {
        if (requiredRole === 'host' && userRole !== 'host') {
            showAlert('ปฏิเสธการเข้าถึง', 'เฉพาะ Host เท่านั้นที่สามารถทำรายการนี้ได้', 'error');
            return false;
        }
        if (requiredRole === 'admin' && userRole !== 'admin' && userRole !== 'host') {
            showAlert('ปฏิเสธการเข้าถึง', 'เฉพาะ Admin หรือ Host เท่านั้นที่สามารถทำรายการนี้ได้', 'error');
            return false;
        }
        return true;
    };

    useEffect(() => { if (companyInfo) setCompanyForm(companyInfo); }, [companyInfo]);
    useEffect(() => { if (popupData) setPopupForm(popupData); }, [popupData]);

    const provinceOptions = useMemo(() => Object.keys(thaiAddressData.tree).sort(), [thaiAddressData]);
    const districtOptions = useMemo(() => {
        if (!formData.province || !thaiAddressData.tree[formData.province]) return [];
        return Object.keys(thaiAddressData.tree[formData.province]).sort();
    }, [thaiAddressData, formData.province]);
    const subdistrictOptions = useMemo(() => {
        if (!formData.province || !formData.district || !thaiAddressData.tree[formData.province]?.[formData.district]) return [];
        return Object.keys(thaiAddressData.tree[formData.province][formData.district]).sort();
    }, [thaiAddressData, formData.province, formData.district]);
    const zipcodeOptionsFromSelect = useMemo(() => {
        if (!formData.province || !formData.district || !formData.subdistrict) return [];
        return thaiAddressData.tree[formData.province]?.[formData.district]?.[formData.subdistrict] || [];
    }, [thaiAddressData, formData.province, formData.district, formData.subdistrict]);

    const handleProvinceSelection = (e) => {
        const province = e.target.value;
        setFormData(prev => ({ ...prev, province, district: '', subdistrict: '', zipcode: '' }));
    };
    const handleDistrictSelection = (e) => {
        const district = e.target.value;
        setFormData(prev => ({ ...prev, district, subdistrict: '', zipcode: '' }));
    };
    const handleSubdistrictSelection = (e) => {
        const subdistrict = e.target.value;
        const zipcodes = thaiAddressData.tree[formData.province]?.[formData.district]?.[subdistrict] || [];
        setFormData(prev => ({ ...prev, subdistrict, zipcode: zipcodes[0] || '' }));
    };

    useEffect(() => {
        const controller = new AbortController();
        let isCancelled = false;

        fetch('https://raw.githubusercontent.com/earthchie/jquery.Thailand.js/master/jquery.Thailand.js/database/raw_database/raw_database.json', {
            signal: controller.signal
        })
            .then(res => {
                if (!res.ok) throw new Error(`Thai address data request failed (${res.status})`);
                return res.json();
            })
            .then(data => {
                if (isCancelled) return;
                const byZipcode = {};
                const tree = {};
                data.forEach(item => {
                    const zip = item.zipcode.toString();
                    if (!byZipcode[zip]) byZipcode[zip] = [];
                    if (!byZipcode[zip].find(x => x.subdistrict === item.district && x.district === item.amphoe && x.province === item.province)) {
                        byZipcode[zip].push({ subdistrict: item.district, district: item.amphoe, province: item.province });
                    }

                    const province = item.province;
                    const district = item.amphoe;
                    const subdistrict = item.district;
                    if (!tree[province]) tree[province] = {};
                    if (!tree[province][district]) tree[province][district] = {};
                    if (!tree[province][district][subdistrict]) tree[province][district][subdistrict] = [];
                    if (!tree[province][district][subdistrict].includes(zip)) {
                        tree[province][district][subdistrict].push(zip);
                    }
                });
                setThaiAddressData({ byZipcode, tree });
            })
            .catch(err => {
                if (err?.name !== 'AbortError') {
                    console.warn('Thai address data is unavailable. Zipcode autocomplete will be disabled.', err);
                }
            });

        return () => {
            isCancelled = true;
            controller.abort();
        };
    }, []);

    /**
     * เทียบกับสต๊อกกลาง (Google Sheet) ว่าบ้านหลังนี้ยังอยู่ไหม
     * รวมชีตของ Startup Up และ Partner เพื่อแสดงบ้านที่ยังไม่ได้ลงเว็บในกลุ่มเจ้าของด้วย
     */
    const loadStockCheck = useCallback(async ({ force = false } = {}) => {
        setIsStockRefreshing(true);
        try {
            const user = auth.currentUser;
            if (!user || user.isAnonymous) throw new Error('ต้องเข้าสู่ระบบก่อน');
            const res = await fetch(`/api/stock-check${force ? '?refresh=1' : ''}`, {
                headers: { Authorization: `Bearer ${await user.getIdToken()}` },
            });
            // 401/403 carry a Thai reason (expired login, no admin role); show it instead of a generic failure.
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'เช็ค Master Stock ไม่สำเร็จ');
            const data = await res.json();
            if (!data?.houses) throw new Error('เช็ค Master Stock ไม่สำเร็จ');
            setStockIndex(data);
            setStockCheckError(data.stale ? 'ข้อมูล Master Stock อาจไม่ใช่ล่าสุด' : '');
        } catch (error) {
            setStockCheckError(error.message || 'เช็ค Master Stock ไม่สำเร็จ');
        } finally {
            setIsStockRefreshing(false);
        }
    }, []);

    useEffect(() => { loadStockCheck(); }, [loadStockCheck]);

    const getStockAlert = (prop) => getPropertyStockAlert(stockIndex, prop);

    const PENDING_PREVIEW_COUNT = 8;

    /**
     * บ้านที่ยังอยู่ในสต๊อกกลางแต่ยังไม่มีในเว็บ — เอาไว้เตือนว่ายังต้องไปลงประกาศ
     * เทียบด้วยบ้านเลขที่ และเผื่อกรณีกรอกเลขไม่ครบด้วยโครงการ+เลขท้าย
     */
    const pendingStockHouses = useMemo(() => getPendingStockHouses(stockIndex, properties), [stockIndex, properties]);
    const groupedProperties = useMemo(() => groupAdminStock(properties, pendingStockHouses, searchTerm), [properties, pendingStockHouses, searchTerm]);

    const OWNER_PREVIEW_COUNT = 6;
    // ค่าเริ่มต้น: ย่อทุกกลุ่มไว้ก่อน กดเองถึงจะกาง (เก็บ false = กางอยู่)
    const isOwnerCollapsed = (owner) => !searchTerm && collapsedOwners[owner] !== false;
    const toggleOwnerCollapse = (owner) => setCollapsedOwners(prev => ({ ...prev, [owner]: prev[owner] === false }));

    /** กดป้าย "N หลังต้องเช็ค" แล้วกางกลุ่มให้ พร้อมกรองเหลือเฉพาะหลังที่ติดป้ายเตือน */
    const toggleOwnerAlertsOnly = (owner) => {
        setCollapsedOwners(prev => ({ ...prev, [owner]: false }));
        setAlertOnlyOwners(prev => ({ ...prev, [owner]: !prev[owner] }));
    };

    const isPendingGroupExpanded = (label) => !!searchTerm || !!expandedPendingGroups[label];
    const togglePendingGroup = (label) => setExpandedPendingGroups(prev => ({ ...prev, [label]: !prev[label] }));
    const toggleOwnerExpand = (owner) => setExpandedOwners(prev => ({ ...prev, [owner]: !prev[owner] }));

    const copyPropertyUrl = async (prop) => {
        try {
            await copyShortShareUrl(prop);
        } catch { showAlert('คัดลอกไม่สำเร็จ', 'กรุณาลองอีกครั้ง', 'warning'); return; }
        setCopiedPropId(prop.id);
        setTimeout(() => setCopiedPropId(curr => (curr === prop.id ? null : curr)), 2000);
    };

    const startEdit = (prop) => {
        setEditData(prop); setFormData({ ...initialForm, ...prop, facilitiesList: prop.facilitiesList || [] }); setImagesPreview(prop.images || (prop.imageUrl ? [prop.imageUrl] : []));
        if (prop.zipcode && thaiAddressData.byZipcode[prop.zipcode]) setAddressOptions(thaiAddressData.byZipcode[prop.zipcode]); else setAddressOptions([]);
        setIsEditing(true);
    };
    const startNew = () => { setEditData(null); setFormData(initialForm); setImagesPreview([]); setAddressOptions([]); setIsEditing(true); };
    const startFromStock = (row) => {
        startNew();
        const price = Number(String(row.price || '').replace(/,/g, ''));
        // Naphat's source sheet quotes prices in millions of baht.
        const priceBaht = row.owner === 'Naphat' && price > 0 && price < 1000 ? Math.round(price * 1000000) : price;
        setFormData({ ...initialForm, property_owner: row.owner || DEFAULT_PROPERTY_OWNER,
            project_name: row.project, house_number: row.houseNumber === '-' ? '' : row.houseNumber,
            custom_id: row.houseNumber === '-' ? '' : row.houseNumber.replace(/\//g, '-').replace(/\s+/g, ''),
            price: priceBaht > 0 ? String(priceBaht) : '' });
    };

    const handleZipcodeChange = (e) => {
        const code = e.target.value; setFormData(prev => ({ ...prev, zipcode: code }));
        if (thaiAddressData && thaiAddressData.byZipcode[code]) { 
            setAddressOptions(thaiAddressData.byZipcode[code]); 
            if (thaiAddressData.byZipcode[code].length === 1) { 
                const addr = thaiAddressData.byZipcode[code][0]; 
                setFormData(prev => ({ ...prev, zipcode: code, subdistrict: addr.subdistrict, district: addr.district, province: addr.province, })); 
            } else { 
                setFormData(prev => ({ ...prev, zipcode: code, subdistrict: '', district: '', province: '' })); 
            } 
        } else { 
            setAddressOptions([]); 
        }
    };
    const handleAddressSelect = (e) => { const index = e.target.value; if (index === "") return; const addr = addressOptions[index]; setFormData(prev => ({ ...prev, subdistrict: addr.subdistrict, district: addr.district, province: addr.province, })); };

    const handlePropertyImageUpload = async (e) => {
        if (!checkAccess('admin')) return;
        const files = sortFilesByName(e.target.files);
        if (!files.length) return;
        
        const allowedFiles = files.slice(0, Math.max(0, MAX_PROPERTY_IMAGES - imagesPreview.length));
        if (allowedFiles.length === 0) { showAlert('แจ้งเตือน', `อัปโหลดได้สูงสุด ${MAX_PROPERTY_IMAGES} รูปครับ`, 'warning'); return; }

        setIsUploadingImgs(true);
        try {
            const uploadedUrls = [];
            for (const file of allowedFiles) {
                validateImage(file);
                const url = await uploadFileToCloudinary(file);
                uploadedUrls.push(url);
            }
            
            setImagesPreview(prev => {
                const newArr = [...prev, ...uploadedUrls];
                setFormData(fd => ({ ...fd, images: newArr }));
                return newArr;
            });
        } catch (error) {
            showAlert('อัปโหลดผิดพลาด', error.message, 'error');
        } finally {
            setIsUploadingImgs(false);
            e.target.value = null; 
        }
    };

    const moveImage = (index, direction) => {
        if (!checkAccess('admin')) return;
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= imagesPreview.length) return;
        const updated = [...imagesPreview];
        const temp = updated[index];
        updated[index] = updated[newIndex];
        updated[newIndex] = temp;
        setImagesPreview(updated);
        setFormData(prev => ({ ...prev, images: updated }));
    };

    const handleLogoUpload = async (e) => {
        if (!checkAccess('host')) return;
        const file = e.target.files[0];
        if (!file) return;

        setIsUploadingLogo(true);
        try {
            validateImage(file);
            const url = await uploadFileToCloudinary(file);
            setCompanyForm(prev => ({...prev, logoUrl: url}));
        } catch (error) {
            showAlert('อัปโหลดผิดพลาด', error.message, 'error');
        } finally {
            setIsUploadingLogo(false);
            e.target.value = null;
        }
    };

    const handlePopupImageUpload = async (e) => {
        if (!checkAccess('host')) return;
        const file = e.target.files[0];
        if (!file) return;

        setIsUploadingPopup(true);
        try {
            validateImage(file);
            const url = await uploadFileToCloudinary(file);
            setPopupForm(prev => ({...prev, imageUrl: url}));
        } catch (error) {
            showAlert('อัปโหลดผิดพลาด', error.message, 'error');
        } finally {
            setIsUploadingPopup(false);
            e.target.value = null;
        }
    };

    const handleSavePopup = async () => {
        if (isUploadingPopup || isSaving) return;
        if (!checkAccess('host')) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_settings', 'popup'), popupForm);
            showAlert('สำเร็จ', 'บันทึกตั้งค่าป๊อปอัปเรียบร้อย', 'success');
        } catch (e) {
            showAlert('ผิดพลาด', e.message, 'error');
        }
        setIsSaving(false);
    };

    const removeImage = (idx) => { 
        if (!checkAccess('admin')) return;
        const updated = imagesPreview.filter((_, i) => i !== idx); setImagesPreview(updated); setFormData(prev => ({ ...prev, images: updated })); 
    };
    
    const handleFacilityChange = (e) => { const val = e.target.value; if (val && !formData.facilitiesList?.includes(val)) setFormData(prev => ({ ...prev, facilitiesList: [...(prev.facilitiesList || []), val] })); };
    const addCustomFacility = () => { if(newFacility && !formData.facilitiesList?.includes(newFacility)) { setFormData(prev => ({ ...prev, facilitiesList: [...(prev.facilitiesList || []), newFacility] })); setNewFacility(''); } };
    const removeFacility = (fac) => { setFormData(prev => ({ ...prev, facilitiesList: prev.facilitiesList.filter(f => f !== fac) })); };

    const handleSaveProperty = async (e) => {
        if (e) e.preventDefault();
        if (!checkAccess('admin')) return;
        
        if (!formData.project_name || !formData.price) {
            showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อโครงการและราคาให้ครบถ้วน', 'warning');
            return;
        }

        setIsSaving(true); 
        
        try {
            const safeLat = formData.lat ? String(formData.lat).replace(/,/g, '.').replace(/\s/g, '') : '';
            const safeLng = formData.lng ? String(formData.lng).replace(/,/g, '.').replace(/\s/g, '') : '';
            
            const dataToSave = {
                ...formData,
                custom_id: formData.custom_id ? formData.custom_id.trim() : '',
                project_name: formData.project_name.trim(),
                property_owner: PROPERTY_OWNERS.includes(formData.property_owner) ? formData.property_owner : DEFAULT_PROPERTY_OWNER,
                lat: safeLat,
                lng: safeLng,
                price: Number(String(formData.price).replace(/,/g, '')) || 0,
                bedrooms: Number(formData.bedrooms) || 0,
                bathrooms: Number(formData.bathrooms) || 0,
                area_wah: Number(formData.area_wah) || 0,
                main_location: formData.main_location || '',
                sub_location: formData.sub_location || '',
                updatedAt: serverTimestamp()
            };

            const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'properties');

            if (editData && editData.id) {
                const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'properties', editData.id);
                await updateDoc(docRef, dataToSave);
            } else {
                await addDoc(collectionRef, {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                });
            }

            showAlert('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
            setIsEditing(false); setEditData(null); setFormData(initialForm); setImagesPreview([]);

        } catch (err) {
            console.error("Save Error Details:", err);
            showAlert('บันทึกไม่สำเร็จ', err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProperty = (id) => { 
        if (!checkAccess('admin')) return;
        showConfirm('ยืนยันการลบ', 'คุณต้องการลบข้อมูลบ้านหลังนี้ใช่หรือไม่?', async () => {
            setIsSaving(true); 
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'properties', id));
            } catch (error) {
                showAlert('ผิดพลาด', error.message, 'error');
            } finally {
                setIsSaving(false); 
            }
        });
    };

    const handleSaveCompany = async (e) => { 
        e.preventDefault(); 
        if (!checkAccess('host')) return;
        setIsSaving(true); 
        const { portfolio_years, ...companyDataOnly } = companyForm; 
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'company_info', 'main'), companyDataOnly, { merge: true }); 
        setIsSaving(false); 
        showAlert('สำเร็จ', 'บันทึกข้อมูลบริษัทเรียบร้อย', 'success'); 
    };

    const handleAddYear = async () => { 
        if (!checkAccess('host')) return;
        if(!newPortfolioYear) return; 
        const currentYears = companyForm.portfolio_years || []; 
        if(currentYears.find(y => y.year === newPortfolioYear)) { showAlert('แจ้งเตือน', 'มีปีนี้อยู่แล้ว', 'warning'); return; } 
        
        const updatedYears = [...currentYears, { year: newPortfolioYear, images: [] }];
        setCompanyForm({ ...companyForm, portfolio_years: updatedYears }); 
        setNewPortfolioYear(''); 
        
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'company_info', 'main'), { portfolio_years: updatedYears }, { merge: true });
    };

    const handleDeleteYear = (year) => { 
        if (!checkAccess('host')) return;
        showConfirm('ยืนยันการลบ', `ยืนยันการลบข้อมูลผลงานปี ${year}?`, async () => {
            const updatedYears = companyForm.portfolio_years.filter(y => y.year !== year);
            setCompanyForm({ ...companyForm, portfolio_years: updatedYears });
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'company_info', 'main'), { portfolio_years: updatedYears }, { merge: true });
        });
    };

    const removePortfolioImageInYear = async (yearValue, imgIndex) => { 
        if (!checkAccess('host')) return;
        const updatedYears = [...companyForm.portfolio_years]; 
        const yearIndex = updatedYears.findIndex(y => y.year === yearValue);
        if (yearIndex > -1) {
            updatedYears[yearIndex] = { ...updatedYears[yearIndex] };
            updatedYears[yearIndex].images = updatedYears[yearIndex].images.filter((_, i) => i !== imgIndex); 
            setCompanyForm({ ...companyForm, portfolio_years: updatedYears }); 
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'company_info', 'main'), { portfolio_years: updatedYears }, { merge: true });
        }
    };
    
    const movePortfolioImageInYear = async (yearValue, imgIndex, direction) => { 
        if (!checkAccess('host')) return;
        const newIndex = imgIndex + direction;
        const updatedYears = [...companyForm.portfolio_years];
        const yearIndex = updatedYears.findIndex(y => y.year === yearValue);
        if (yearIndex > -1) {
            const images = [...updatedYears[yearIndex].images];
            if (newIndex < 0 || newIndex >= images.length) return;
            const temp = images[imgIndex];
            images[imgIndex] = images[newIndex];
            images[newIndex] = temp;
            updatedYears[yearIndex] = { ...updatedYears[yearIndex], images };
            setCompanyForm({ ...companyForm, portfolio_years: updatedYears });
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'company_info', 'main'), { portfolio_years: updatedYears }, { merge: true });
        }
    };

    const handlePortfolioUpload = async (e, yearValue) => { 
        if (!checkAccess('host')) return;
        const files = sortFilesByName(e.target.files);
        if (!files.length) return;

        setIsUploadingPortfolio({ state: true, year: yearValue });
        try {
            const uploadedUrls = [];
            for (const file of files) {
                validateImage(file);
                const url = await uploadFileToCloudinary(file);
                uploadedUrls.push(url);
            }
            
            const updatedYears = [...(companyForm.portfolio_years || [])];
            const yearIndex = updatedYears.findIndex(y => y.year === yearValue);
            if (yearIndex > -1) {
                updatedYears[yearIndex] = { ...updatedYears[yearIndex] };
                /* รูปชุดใหม่ขึ้นก่อนรูปเดิม โดยคงลำดับชื่อไฟล์ภายในชุดที่อัปโหลด */
                updatedYears[yearIndex].images = [...uploadedUrls, ...(updatedYears[yearIndex].images || [])];
            }
            setCompanyForm({ ...companyForm, portfolio_years: updatedYears });
            
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'company_info', 'main'), { portfolio_years: updatedYears }, { merge: true });

        } catch (error) {
            showAlert('อัปโหลดผิดพลาด', error.message, 'error');
        } finally {
            setIsUploadingPortfolio({ state: false, year: null });
            e.target.value = null;
        }
    };
    
    const handleSavePortfolio = async () => { 
        if (!checkAccess('host')) return;
        setIsSaving(true); 
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'company_info', 'main'), { portfolio_years: companyForm.portfolio_years }, { merge: true }); 
        setIsSaving(false); 
        showAlert('สำเร็จ', 'บันทึกรูปผลงานทั้งหมดเรียบร้อย', 'success'); 
    };

    const handleAddUser = async (e) => { 
        e.preventDefault(); 
        if (!checkAccess('host')) return;
        if (!inviteEmail) return; 
        try { 
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', inviteEmail.toLowerCase().trim()), { email: inviteEmail.toLowerCase().trim(), role: inviteRole, addedBy: userEmail, createdAt: serverTimestamp() }); 
            setInviteEmail(''); 
            showAlert('สำเร็จ', 'เพิ่มผู้ใช้เรียบร้อยแล้ว', 'success'); 
        } catch (err) { 
            showAlert('ผิดพลาด', err.message, 'error'); 
        } 
    };
    const handleUpdateRole = (userId, newRole) => { 
        if (!checkAccess('host')) return;
        showConfirm('ยืนยันการเปลี่ยนสิทธิ์', `ยืนยันเปลี่ยนสิทธิ์เป็น ${newRole}?`, async () => {
            try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId), { role: newRole }); } 
            catch (err) { showAlert('ผิดพลาด', err.message, 'error'); }
        });
    };
    const handleApproveUser = (userId, role, email) => { 
        if (!checkAccess('host')) return;
        showConfirm('ยืนยันการอนุมัติ', `อนุมัติสิทธิ์ ${role} ให้ ${email}?`, async () => {
            try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId), { role: role }); } 
            catch (err) { showAlert('ผิดพลาด', err.message, 'error'); }
        });
    };
    const handleRemoveUser = (id) => { 
        if (!checkAccess('host')) return;
        showConfirm('ยืนยันการลบ', 'ลบสิทธิ์ผู้ใช้นี้?', async () => {
            try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id)); } 
            catch (err) { showAlert('ผิดพลาด', err.message, 'error'); }
        });
    };


    return (
        <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col font-sans">
            {isSaving && <div className="absolute inset-0 z-[100] bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm"><Loader size={48} className="animate-spin mb-4"/><h3 className="font-light">กำลังบันทึก...</h3></div>}

            <div className="bg-white border-b px-6 py-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                    <span className="text-xl font-light text-brand-green tracking-widest uppercase">Admin Panel</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{userRole}</span>
                </div>
                <div className="flex gap-4 items-center">
                    <button onClick={onClose} className="text-sm text-gray-500 hover:text-black transition">กลับหน้าเว็บ</button>
                    <button onClick={onLogout} className="text-sm bg-red-50 text-red-500 px-4 py-1.5 rounded-full hover:bg-red-50 hover:text-white transition">ออกจากระบบ</button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="w-64 bg-white border-r py-6 flex flex-col gap-2 hidden md:flex">
                    {userRole === 'host' && <button onClick={enterVisualEditMode} className={`px-6 py-3 text-left text-sm flex items-center gap-3 transition text-blue-600 hover:bg-blue-50 bg-blue-50/50`}><Layout size={18}/> ปรับแก้หน้าตาเว็บไซต์</button>}
                    <button onClick={() => { setPanelTab('properties'); setIsEditing(false); }} className={`px-6 py-3 text-left text-sm flex items-center gap-3 transition ${panelTab === 'properties' ? 'text-brand-green bg-brand-light font-medium border-r-2 border-brand-green' : 'text-gray-500 hover:bg-gray-50'}`}><Home size={18}/> จัดการบ้าน <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-600 ml-1">{properties.length}</span></button>
                    {userRole === 'host' && <button onClick={() => setPanelTab('company')} className={`px-6 py-3 text-left text-sm flex items-center gap-3 transition ${panelTab === 'company' ? 'text-brand-green bg-brand-light font-medium border-r-2 border-brand-green' : 'text-gray-500 hover:bg-gray-50'}`}><Briefcase size={18}/> ข้อมูลบริษัท</button>}
                    {userRole === 'host' && <button onClick={() => setPanelTab('portfolio_images')} className={`px-6 py-3 text-left text-sm flex items-center gap-3 transition ${panelTab === 'portfolio_images' ? 'text-brand-green bg-brand-light font-medium border-r-2 border-brand-green' : 'text-gray-500 hover:bg-gray-50'}`}><ImageIcon size={18}/> จัดการรูปผลงาน</button>}
                    {userRole === 'host' && <button onClick={() => setPanelTab('popup')} className={`px-6 py-3 text-left text-sm flex items-center gap-3 transition ${panelTab === 'popup' ? 'text-brand-green bg-brand-light font-medium border-r-2 border-brand-green' : 'text-gray-500 hover:bg-gray-50'}`}><LayoutTemplate size={18}/> จัดการป๊อปอัป</button>}
                    {userRole === 'host' && <button onClick={() => setPanelTab('sale_promotion')} className={`px-6 py-3 text-left text-sm flex items-center gap-3 transition ${panelTab === 'sale_promotion' ? 'text-brand-green bg-brand-light font-medium border-r-2 border-brand-green' : 'text-gray-500 hover:bg-gray-50'}`}><LayoutTemplate size={18}/> โปรโมชั่นหน้าบ้าน</button>}
                    {userRole === 'host' && <button onClick={() => setPanelTab('users')} className={`px-6 py-3 text-left text-sm flex items-center gap-3 transition ${panelTab === 'users' ? 'text-brand-green bg-brand-light font-medium border-r-2 border-brand-green' : 'text-gray-500 hover:bg-gray-50'}`}><Users size={18}/> ผู้ดูแลระบบ</button>}
                </div>

                <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <div className="md:hidden flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
                        {userRole === 'host' && <button onClick={enterVisualEditMode} className={`whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2 rounded-full transition bg-blue-50 text-blue-600 border border-blue-200`}><Layout size={14}/> ปรับแก้หน้าเว็บ</button>}
                        <button onClick={() => { setPanelTab('properties'); setIsEditing(false); }} className={`whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2 rounded-full transition ${panelTab === 'properties' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 border'}`}><Home size={14}/> จัดการบ้าน</button>
                        {userRole === 'host' && <button onClick={() => setPanelTab('company')} className={`whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2 rounded-full transition ${panelTab === 'company' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 border'}`}><Briefcase size={14}/> ข้อมูลบริษัท</button>}
                        {userRole === 'host' && <button onClick={() => setPanelTab('portfolio_images')} className={`whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2 rounded-full transition ${panelTab === 'portfolio_images' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 border'}`}><ImageIcon size={14}/> รูปผลงาน</button>}
                        {userRole === 'host' && <button onClick={() => setPanelTab('popup')} className={`whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2 rounded-full transition ${panelTab === 'popup' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 border'}`}><LayoutTemplate size={14}/> จัดการป๊อปอัป</button>}
                        {userRole === 'host' && <button onClick={() => setPanelTab('sale_promotion')} className={`whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2 rounded-full transition ${panelTab === 'sale_promotion' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 border'}`}><LayoutTemplate size={14}/> โปรโมชั่นหน้าบ้าน</button>}
                        {userRole === 'host' && <button onClick={() => setPanelTab('users')} className={`whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2 rounded-full transition ${panelTab === 'users' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 border'}`}><Users size={14}/> ผู้ดูแลระบบ</button>}
                    </div>

                    {panelTab === 'properties' && !isEditing && (
                        <div className="max-w-6xl mx-auto">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <div>
                                    <h3 className="text-2xl font-light">รายการทรัพย์สิน <span className="text-sm text-gray-500 ml-2">({properties.length} รายการ)</span></h3>
                                    {stockCheckError ? (
                                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle size={12}/> {stockCheckError}</p>
                                    ) : stockIndex ? (
                                        <>
                                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 flex-wrap">
                                                เทียบกับ
                                                <a href={stockIndex.sheetUrl} target="_blank" rel="noreferrer" className="underline hover:text-brand-green">Master Stock</a>
                                                ของ All in One ({stockIndex.houseCount} รายการ) แล้ว — ป้าย <AlertTriangle size={11} className="text-red-500"/> คือรายการที่ควรตรวจสอบกับชีตต้นทางก่อนแก้ไขหรือลบ
                                                <button
                                                    type="button"
                                                    onClick={() => loadStockCheck({ force: true })}
                                                    disabled={isStockRefreshing}
                                                    className="underline hover:text-brand-green disabled:opacity-50"
                                                >
                                                    {isStockRefreshing ? 'กำลังโหลด...' : 'โหลดสต๊อกใหม่'}
                                                </button>
                                            </p>
                                            {!stockIndex.coversPartners && (
                                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle size={12}/> อ่านชีตได้ไม่ครบ — ยังไม่สรุปสถานะของเจ้าของที่อ่านข้อมูลไม่ได้</p>
                                            )}
                                        </>
                                    ) : null}
                                </div>
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <input type="text" placeholder="ค้นหา..." className="input-modern py-2 w-full sm:w-64" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                                    <button onClick={startNew} className="btn-primary whitespace-nowrap"><Plus size={16}/> เพิ่มใหม่</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-6">
                                {groupedProperties.map(({ owner, items, pending }) => {
                                    const alertItems = items.filter((prop) => getStockAlert(prop));
                                    const alertCount = alertItems.length;
                                    const alertOnly = alertCount > 0 && !!alertOnlyOwners[owner];
                                    const isCollapsed = isOwnerCollapsed(owner) && !alertOnly;
                                    const listItems = alertOnly ? alertItems : items;
                                    const isExpanded = !!searchTerm || !!expandedOwners[owner] || alertOnly;
                                    const visibleItems = isExpanded ? listItems : listItems.slice(0, OWNER_PREVIEW_COUNT);
                                    const hiddenCount = listItems.length - visibleItems.length;
                                    const canToggleMore = !searchTerm && !alertOnly && items.length > OWNER_PREVIEW_COUNT;
                                    return (
                                    <section key={owner} className="space-y-3">
                                        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm hover:border-brand-green/40 transition">
                                            <button
                                                type="button"
                                                onClick={() => toggleOwnerCollapse(owner)}
                                                aria-expanded={!isCollapsed}
                                                className="flex flex-1 items-center gap-2 flex-wrap text-left min-w-0 py-1 group"
                                            >
                                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                                <Briefcase size={16} className="text-brand-green" />
                                                <h4 className="font-medium text-brand-green group-hover:underline">บ้านของ {owner}</h4>
                                                {owner !== DEFAULT_PROPERTY_OWNER && (
                                                    <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">ไม่แสดงบนเว็บ</span>
                                                )}
                                            </button>

                                            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                                                {alertCount > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleOwnerAlertsOnly(owner)}
                                                        title={alertOnly ? 'กลับไปดูทั้งหมด' : 'ดูเฉพาะหลังที่ต้องเช็ค'}
                                                        className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 transition ${alertOnly ? 'text-white bg-red-500 border-red-500' : 'text-red-600 bg-red-50 border-red-100 hover:bg-red-100'}`}
                                                    >
                                                        <AlertTriangle size={11}/> {alertCount} หลังต้องเช็ค
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleOwnerCollapse(owner)}
                                                    className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full hover:bg-gray-100 hover:text-gray-600 transition"
                                                >
                                                    {items.length + pending.length} รายการ • บันทึกในเว็บ {items.length} • รอลงเว็บ {pending.length}{isCollapsed ? ' • กดเพื่อแสดง' : ''}
                                                </button>
                                            </div>
                                        </div>

                                        {alertOnly && (
                                            <button
                                                type="button"
                                                onClick={() => toggleOwnerAlertsOnly(owner)}
                                                className="w-full text-left text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 hover:bg-red-100 transition"
                                            >
                                                กำลังแสดงเฉพาะ {alertCount} หลังที่ต้องเช็ค — กดเพื่อกลับไปดูทั้ง {items.length} หลัง
                                            </button>
                                        )}

                                        {!isCollapsed && (items.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-4">
                                                {visibleItems.map(p => {
                                                  const stockAlert = getStockAlert(p);
                                                  return (
                                                    <div key={p.id} className={`bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row gap-4 items-center ${stockAlert ? 'border-red-200 ring-1 ring-red-50' : 'border-gray-100'}`}>
                                                        <div className="w-full sm:w-24 h-40 sm:h-24 rounded-lg overflow-hidden relative bg-gray-100 flex-shrink-0">
                                                            <SmartImage src={getOptimizedImg(p.images?.[0] || p.imageUrl || "https://placehold.co/300x300", 300)} className="w-full h-full object-cover" alt={p.project_name || 'Property image'} width={300} height={300} sizes="96px" loading="lazy" decoding="async" />
                                                        </div>
                                                        <div className="flex-1 w-full text-center sm:text-left">
                                                            <h4 className="font-medium line-clamp-1">{p.project_name}</h4>
                                                            <p className="text-xs text-gray-500 mt-1">{p.category} • {p.subdistrict}</p>
                                                            <p className="font-medium text-brand-green mt-1">{Number(String(p.price).replace(/,/g, '') || 0).toLocaleString()} ฿</p>
                                                            {stockAlert && (
                                                                <span
                                                                    title={stockAlert.title}
                                                                    className={`mt-2 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border ${stockAlert.type === 'missing' ? 'text-red-600 bg-red-50 border-red-100' : 'text-amber-700 bg-amber-50 border-amber-100'}`}
                                                                >
                                                                    <AlertTriangle size={12}/> {stockAlert.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2 w-full sm:w-auto justify-center">
                                                            <button onClick={() => copyPropertyUrl(p)} title="คัดลอกลิงก์บ้านหลังนี้" className={`p-2 w-full sm:w-auto flex justify-center bg-gray-50 rounded-lg transition ${copiedPropId === p.id ? 'text-green-600' : 'text-gray-400 hover:text-brand-green'}`}>
                                                                {copiedPropId === p.id ? <Check size={18}/> : <Copy size={18}/>}
                                                            </button>
                                                            <button onClick={() => startEdit(p)} title="แก้ไข" className="p-2 w-full sm:w-auto flex justify-center text-gray-400 hover:text-brand-green bg-gray-50 rounded-lg transition"><Edit size={18}/></button>
                                                            <button onClick={() => handleDeleteProperty(p.id)} title="ลบ" className="p-2 w-full sm:w-auto flex justify-center text-gray-400 hover:text-red-500 bg-gray-50 rounded-lg transition"><Trash2 size={18}/></button>
                                                        </div>
                                                    </div>
                                                  );
                                                })}

                                                {canToggleMore && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleOwnerExpand(owner)}
                                                        className="w-full flex items-center justify-center gap-1.5 bg-white border border-dashed border-gray-200 text-sm text-gray-500 hover:text-brand-green hover:border-brand-green/40 rounded-xl py-3 transition"
                                                    >
                                                        {hiddenCount > 0 ? `แสดงเพิ่มเติมอีก ${hiddenCount} รายการ` : 'ย่อรายการ'}
                                                        <ChevronDown size={16} className={`transition-transform ${hiddenCount > 0 ? '' : 'rotate-180'}`} />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            pending.length === 0 ? <div className="bg-white/70 border border-dashed border-gray-200 rounded-xl px-4 py-6 text-center text-sm text-gray-400">ยังไม่มีบ้านในกลุ่มนี้</div> : null
                                        ))}
                                        {!isCollapsed && !alertOnly && pending.length > 0 && (
                                            <div className="bg-white border border-blue-100 rounded-xl overflow-hidden">
                                                <h5 className="px-4 py-3 text-sm font-medium text-blue-700 bg-blue-50">จาก Master Stock • ยังไม่ได้ลงเว็บ {pending.length} หลัง</h5>
                                                <ul className="divide-y divide-gray-100">
                                                    {(isPendingGroupExpanded(owner) ? pending : pending.slice(0, PENDING_PREVIEW_COUNT)).map(row => (
                                                        <li key={`${row.source}-${row.key}-${row.project}`} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-gray-700">{row.project || 'ไม่ระบุโครงการ'} • {row.houseNumber}</p>
                                                                <p className="text-xs text-gray-500 mt-1">{[row.zone, row.status].filter(Boolean).join(' • ')}</p>
                                                            </div>
                                                            <button type="button" onClick={() => startFromStock(row)} className="text-blue-700 bg-blue-50 rounded-lg px-3 py-2 self-start flex items-center gap-1"><Plus size={14}/> เพิ่มข้อมูลลงเว็บ</button>
                                                        </li>
                                                    ))}
                                                </ul>
                                                {!searchTerm && pending.length > PENDING_PREVIEW_COUNT && (
                                                    <button type="button" onClick={() => togglePendingGroup(owner)} className="w-full text-xs text-blue-700 bg-blue-50/50 py-3">
                                                        {isPendingGroupExpanded(owner) ? 'ย่อรายการจาก Master Stock' : `ดูจาก Master Stock อีก ${pending.length - PENDING_PREVIEW_COUNT} หลัง`}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </section>
                                    );
                                })}


                            </div>
                        </div>
                    )}

                    {panelTab === 'properties' && isEditing && (
                        <div className="max-w-6xl mx-auto pb-10">
                            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8 border-b pb-4 sticky top-0 bg-gray-50 z-20 py-2">
                                <h3 className="text-2xl font-light">{editData ? 'แก้ไขข้อมูล' : 'เพิ่มรายการใหม่'}</h3>
                                <div className="flex gap-3">
                                    <button onClick={()=>setIsEditing(false)} className="px-6 py-2 text-gray-500 hover:bg-gray-200 bg-white border rounded-full transition w-full sm:w-auto">ยกเลิก</button>
                                    <button onClick={handleSaveProperty} className="btn-primary w-full sm:w-auto">บันทึกข้อมูล</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h4 className="font-medium mb-6 pb-2 border-b">ข้อมูลหลัก</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="sm:col-span-2"><label className="label">ชื่อโครงการ <span className="text-red-500">*</span></label><input className="input-modern" required value={formData.project_name} onChange={e=>setFormData({...formData, project_name: e.target.value})}/></div>
                                            <div className="sm:col-span-2">
                                                <label className="label">บ้านของบริษัท/เจ้าของ</label>
                                                <select className="input-modern" value={formData.property_owner || DEFAULT_PROPERTY_OWNER} onChange={e=>setFormData({...formData, property_owner: e.target.value})}>
                                                    {PROPERTY_OWNERS.map(owner => <option key={owner} value={owner}>{owner}</option>)}
                                                </select>
                                                {(formData.property_owner || DEFAULT_PROPERTY_OWNER) !== DEFAULT_PROPERTY_OWNER && (
                                                    <p className="text-xs text-amber-700 mt-1">บ้านของเจ้าของอื่นจะไม่ขึ้นบนเว็บ (ยังส่งลิงก์ตรงให้ลูกค้าดูได้)</p>
                                                )}
                                            </div>
                                            <div><label className="label">ประเภท</label><select className="input-modern" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                                            <div><label className="label">ราคา (บาท) <span className="text-red-500">*</span></label><input type="text" inputMode="numeric" required className="input-modern font-medium text-brand-green" value={Number(String(formData.price).replace(/,/g, '') || 0).toLocaleString()} onChange={e=>setFormData({...formData, price: e.target.value.replace(/[^0-9]/g, '')})}/></div>
                                            <div className="sm:col-span-2">
                                                <label className="label">ป้ายสถานะ (Badge)</label>
                                                <select className="input-modern" value={formData.badge} onChange={e=>setFormData({...formData, badge: e.target.value})}>
                                                    {BADGES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="sm:col-span-2"><label className="label">รายละเอียด (จุดเด่น)</label><textarea rows="4" className="input-modern" value={formData.highlights} onChange={e=>setFormData({...formData, highlights: e.target.value})}/></div>
                                            <PropertyEditorialFields value={formData} onChange={setFormData} />
                                            <div className="sm:col-span-2"><label className="label">ลิงก์ YouTube (Optional)</label><input className="input-modern" placeholder="https://youtube.com/..." value={formData.youtubeUrl} onChange={e=>setFormData({...formData, youtubeUrl: e.target.value})}/></div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h4 className="font-medium mb-6 pb-2 border-b">ทำเลแสดงผลบนหน้าเว็บ (ตามหมวดหมู่)</h4>
                                        <AdminLocationFields
                                            locations={locations}
                                            main={formData.main_location}
                                            sub={formData.sub_location}
                                            onChange={selection => setFormData(previous => ({ ...previous, ...selection }))}
                                        />
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h4 className="font-medium mb-6 pb-2 border-b">รายละเอียด</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="label">ID บ้าน (สร้างอัตโนมัติ)</label>
                                                <input className="input-modern bg-gray-100 text-gray-500 pointer-events-none outline-none select-none" value={formData.custom_id || ''} readOnly title="สร้างอัตโนมัติจากบ้านเลขที่"/>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="label">บ้านเลขที่</label>
                                                <input className="input-modern" value={formData.house_number} onChange={e=>{ 
                                                    const val = e.target.value; 
                                                    setFormData({...formData, house_number: val, custom_id: val.replace(/\//g, '-').replace(/\s+/g, '')}); 
                                                }}/>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="label">ซอย</label>
                                                <input className="input-modern" value={formData.soi} onChange={e=>setFormData({...formData, soi: e.target.value})}/>
                                            </div>
                                            
                                            <div><label className="label">ห้องนอน</label><input type="text" inputMode="numeric" className="input-modern" value={formData.bedrooms} onChange={e=>setFormData({...formData, bedrooms: e.target.value.replace(/[^0-9]/g, '')})}/></div>
                                            <div><label className="label">ห้องน้ำ</label><input type="text" inputMode="numeric" className="input-modern" value={formData.bathrooms} onChange={e=>setFormData({...formData, bathrooms: e.target.value.replace(/[^0-9]/g, '')})}/></div>
                                            <div><label className="label">จอดรถ</label><input type="text" inputMode="numeric" className="input-modern" value={formData.parking} onChange={e=>setFormData({...formData, parking: e.target.value.replace(/[^0-9]/g, '')})}/></div>
                                            <div><label className="label">ตร.ว.</label><input type="text" inputMode="numeric" className="input-modern" value={formData.area_wah} onChange={e=>setFormData({...formData, area_wah: e.target.value.replace(/[^0-9.]/g, '')})}/></div>
                                            <div><label className="label">ตร.ม.</label><input type="text" inputMode="numeric" className="input-modern" value={formData.area_sqm} onChange={e=>setFormData({...formData, area_sqm: e.target.value.replace(/[^0-9.]/g, '')})}/></div>
                                            <div><label className="label">จำนวนชั้น</label><input type="text" inputMode="numeric" className="input-modern" value={formData.floors} onChange={e=>setFormData({...formData, floors: e.target.value.replace(/[^0-9]/g, '')})}/></div>
                                            <div className="col-span-2 sm:col-span-3"><label className="label">ทิศ</label><select className="input-modern" value={formData.direction} onChange={e=>setFormData({...formData, direction: e.target.value})}><option value="">- เลือก -</option>{DIRECTIONS.map(d=><option key={d}>{d}</option>)}</select></div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h4 className="font-medium mb-6 pb-2 border-b">ที่ตั้ง (สำหรับแสดงในแผนที่)</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="sm:col-span-2"><label className="label">จังหวัด (เลือกได้)</label>
                                                <select className="input-modern" value={formData.province} onChange={handleProvinceSelection}>
                                                    <option value="">- เลือกจังหวัด -</option>
                                                    {provinceOptions.map(prov => <option key={prov} value={prov}>{prov}</option>)}
                                                </select>
                                            </div>
                                            {districtOptions.length > 0 && (
                                                <div className="sm:col-span-2"><label className="label">อำเภอ (เลือกได้)</label>
                                                    <select className="input-modern" value={formData.district} onChange={handleDistrictSelection}>
                                                        <option value="">- เลือกอำเภอ -</option>
                                                        {districtOptions.map(dist => <option key={dist} value={dist}>{dist}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            {subdistrictOptions.length > 0 && (
                                                <div className="sm:col-span-2"><label className="label">ตำบล/แขวง (เลือกได้)</label>
                                                    <select className="input-modern" value={formData.subdistrict} onChange={handleSubdistrictSelection}>
                                                        <option value="">- เลือกตำบล/แขวง -</option>
                                                        {subdistrictOptions.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="sm:col-span-2"><label className="label">รหัสไปรษณีย์</label><input type="text" inputMode="numeric" className="input-modern" value={formData.zipcode} onChange={handleZipcodeChange}/></div>
                                            {zipcodeOptionsFromSelect.length > 1 && (
                                                <div className="sm:col-span-2">
                                                    <label className="label text-brand-green">เลือกชุดรหัสไปรษณีย์</label>
                                                    <select className="input-modern" value={formData.zipcode} onChange={e => setFormData(prev => ({ ...prev, zipcode: e.target.value }))}>
                                                        <option value="">- เลือก -</option>
                                                        {zipcodeOptionsFromSelect.map(zip => <option key={zip} value={zip}>{zip}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            {addressOptions.length > 1 && (
                                                <div className="sm:col-span-2">
                                                    <label className="label text-brand-green">เลือกตำบล/แขวง จากรหัสไปรษณีย์</label>
                                                    <select className="input-modern" onChange={handleAddressSelect} defaultValue=""><option value="" disabled>- เลือก -</option>{addressOptions.map((opt, idx)=><option key={idx} value={idx}>{opt.subdistrict} - {opt.district}</option>)}</select>
                                                </div>
                                            )}
                                            <div><label className="label">ตำบล</label><input className="input-modern bg-gray-50" readOnly value={formData.subdistrict}/></div>
                                            <div><label className="label">อำเภอ</label><input className="input-modern bg-gray-50" readOnly value={formData.district}/></div>
                                            <div className="sm:col-span-2"><label className="label">จังหวัด</label><input className="input-modern bg-gray-50" readOnly value={formData.province}/></div>
                                            <div><label className="label">ละติจูด (Lat)</label><input type="text" className="input-modern" value={formData.lat} onChange={e=>setFormData({...formData, lat: e.target.value})}/></div>
                                            <div><label className="label">ลองจิจูด (Lng)</label><input type="text" className="input-modern" value={formData.lng} onChange={e=>setFormData({...formData, lng: e.target.value})}/></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h4 className="font-medium mb-6 pb-2 border-b">รูปภาพ <span className="text-sm text-gray-500">({imagesPreview.length}/{MAX_PROPERTY_IMAGES} รูป)</span></h4>
                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            {imagesPreview.map((img, i) => (
                                                <div key={i} className="aspect-square bg-gray-100 rounded-lg relative group overflow-hidden border">
                                                    <SmartImage src={img} className="w-full h-full object-cover" alt={`Property image ${i + 1}`} width={240} height={240} sizes="120px" loading="lazy" decoding="async" />
                                                    
                                                    <button type="button" onClick={()=>removeImage(i)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition z-10 shadow-sm" title="ลบรูปภาพ">
                                                        <X size={12}/>
                                                    </button>
                                                    
                                                    <div className="absolute bottom-1 left-1 right-1 flex justify-between opacity-100 md:opacity-0 md:group-hover:opacity-100 transition z-10">
                                                        <button type="button" onClick={()=>moveImage(i, -1)} disabled={i === 0} className="bg-black/60 text-white p-1.5 rounded-full disabled:opacity-30 hover:bg-black transition" title="เลื่อนมาด้านหน้า">
                                                            <ChevronLeft size={14}/>
                                                        </button>
                                                        <button type="button" onClick={()=>moveImage(i, 1)} disabled={i === imagesPreview.length - 1} className="bg-black/60 text-white p-1.5 rounded-full disabled:opacity-30 hover:bg-black transition" title="เลื่อนไปด้านหลัง">
                                                            <ChevronRight size={14}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {imagesPreview.length < MAX_PROPERTY_IMAGES && (
                                                <label className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 w-full transition relative">
                                                    {isUploadingImgs ? (
                                                        <Loader className="animate-spin text-brand-green" size={24} />
                                                    ) : (
                                                        <>
                                                            <Upload size={20} className="text-gray-400 mb-1" />
                                                            <span className="text-[10px] text-gray-500">เพิ่มรูป</span>
                                                            <input type="file" multiple accept="image/*" className="hidden" onChange={handlePropertyImageUpload} />
                                                        </>
                                                    )}
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h4 className="font-medium mb-6 pb-2 border-b">สิ่งอำนวยความสะดวก</h4>
                                        <select className="input-modern mb-3" value="" onChange={handleFacilityChange}><option value="">- เลือกจากรายการ -</option>{COMMON_FACILITIES.map(f=><option key={f}>{f}</option>)}</select>
                                        <div className="flex gap-2 mb-4">
                                            <input className="input-modern text-sm" placeholder="พิมพ์เพิ่มเอง" value={newFacility} onChange={e=>setNewFacility(e.target.value)}/>
                                            <button type="button" onClick={addCustomFacility} className="bg-brand-green text-white px-3 rounded-lg"><Plus size={16}/></button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {formData.facilitiesList?.map((fac, i) => (
                                                <span key={i} className="px-3 py-1 rounded-full text-xs bg-brand-light text-brand-green flex items-center gap-1 border border-brand-green/20">{fac} <button type="button" onClick={()=>removeFacility(fac)}><X size={12}/></button></span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {panelTab === 'company' && (
                        <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-2xl font-light mb-8 pb-4 border-b">ข้อมูลบริษัท</h3>
                            <form onSubmit={handleSaveCompany} className="space-y-6">
                                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#123b2c] relative group flex-shrink-0">
                                        {isUploadingLogo ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-200"><Loader className="animate-spin text-brand-green" size={24} /></div>
                                        ) : (
                                            <>
                                                <SmartImage src={getOptimizedImg(companyForm.logoUrl, 300)} className="w-full h-full object-contain p-2" alt="Company logo" width={300} height={300} sizes="96px" loading="lazy" decoding="async" />
                                                <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer text-xs w-full h-full transition">
                                                    <Upload size={16}/>เปลี่ยน
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                                </label>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex-1 w-full"><label className="label">ชื่อแบรนด์ / บริษัท</label><input className="input-modern" value={companyForm.name} onChange={e=>setCompanyForm({...companyForm, name: e.target.value})}/></div>
                                </div>
                                <div><label className="label">ที่อยู่</label><textarea className="input-modern" rows="3" value={companyForm.address} onChange={e=>setCompanyForm({...companyForm, address: e.target.value})}/></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="label">เบอร์โทร</label><input className="input-modern" value={companyForm.phone} onChange={e=>setCompanyForm({...companyForm, phone: e.target.value})}/></div>
                                    <div><label className="label">Email</label><input className="input-modern" value={companyForm.email} onChange={e=>setCompanyForm({...companyForm, email: e.target.value})}/></div>
                                    <div><label className="label">Line URL</label><input className="input-modern" value={companyForm.line} onChange={e=>setCompanyForm({...companyForm, line: e.target.value})}/></div>
                                    <div><label className="label">Facebook URL</label><input className="input-modern" value={companyForm.facebook} onChange={e=>setCompanyForm({...companyForm, facebook: e.target.value})}/></div>
                                </div>
                                <div><label className="label">สโลแกน / คำโปรย</label><input className="input-modern" value={companyForm.description} onChange={e=>setCompanyForm({...companyForm, description: e.target.value})}/></div>
                                <div className="text-right pt-4"><button className="btn-primary w-full sm:w-auto">บันทึกข้อมูล</button></div>
                            </form>
                        </div>
                    )}

                    {panelTab === 'portfolio_images' && (
                        <div className="max-w-5xl mx-auto">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b pb-4">
                                <h3 className="text-2xl font-light">จัดการรูปผลงาน</h3>
                                <button onClick={handleSavePortfolio} className="btn-primary w-full sm:w-auto">บันทึกทั้งหมด</button>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col sm:flex-row gap-4 items-end">
                                <div className="w-full sm:w-auto"><label className="label">สร้างหมวดหมู่ปี (ค.ศ. หรือ พ.ศ.)</label><input type="text" inputMode="numeric" className="input-modern w-full sm:w-48" value={newPortfolioYear} onChange={e=>setNewPortfolioYear(e.target.value.replace(/[^0-9]/g, ''))}/></div>
                                <button onClick={handleAddYear} className="px-6 py-2.5 bg-gray-800 text-white rounded-lg w-full sm:w-auto">สร้างโฟลเดอร์</button>
                            </div>
                            <div className="space-y-6">
                                {[...(companyForm.portfolio_years || [])].sort((a,b)=>Number(b.year)-Number(a.year)).map((yg) => (
                                    <div key={yg.year} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="text-lg font-medium">ผลงานปี {yg.year}</h4>
                                            <button onClick={()=>handleDeleteYear(yg.year)} className="text-sm text-red-500 hover:underline">ลบหมวดหมู่นี้</button>
                                        </div>
                                        <div className="mb-4 relative">
                                            <label className={`inline-flex items-center justify-center sm:justify-start w-full sm:w-auto gap-2 px-4 py-2 bg-gray-50 border rounded-lg text-sm transition ${isUploadingPortfolio.state && isUploadingPortfolio.year === yg.year ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}`}>
                                                {isUploadingPortfolio.state && isUploadingPortfolio.year === yg.year ? (
                                                    <><Loader size={16} className="animate-spin" /> กำลังอัปโหลด...</>
                                                ) : (
                                                    <><Upload size={16}/> เลือกรูปภาพ (เลือกได้หลายรูป)<input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handlePortfolioUpload(e, yg.year)} /></>
                                                )}
                                            </label>
                                        </div>
                                        {yg.images && yg.images.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                {yg.images.map((img, i) => (
                                                    <div key={i} className="aspect-square bg-gray-100 rounded-lg relative group overflow-hidden border">
                                                        <SmartImage src={getOptimizedImg(img, 300)} className="w-full h-full object-contain" alt={`Portfolio ${yg.year} image ${i + 1}`} width={300} height={300} sizes="160px" loading="lazy" decoding="async" />
                                                        
                                                        <button onClick={()=>removePortfolioImageInYear(yg.year, i)} className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition z-10 shadow-sm" title="ลบรูปภาพ"><X size={14}/></button>
                                                        
                                                        <div className="absolute bottom-1 left-1 right-1 flex justify-between opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition z-10">
                                                            <button type="button" onClick={()=>movePortfolioImageInYear(yg.year, i, -1)} disabled={i === 0} className="bg-black/60 text-white p-1.5 rounded-full disabled:opacity-30 hover:bg-black transition" title="เลื่อนมาด้านหน้า">
                                                                <ChevronLeft size={14}/>
                                                            </button>
                                                            <button type="button" onClick={()=>movePortfolioImageInYear(yg.year, i, 1)} disabled={i === yg.images.length - 1} className="bg-black/60 text-white p-1.5 rounded-full disabled:opacity-30 hover:bg-black transition" title="เลื่อนไปด้านหลัง">
                                                                <ChevronRight size={14}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 text-center py-8 bg-gray-50 rounded-lg border border-dashed">ยังไม่มีรูปภาพในหมวดหมู่นี้</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {panelTab === 'sale_promotion' && userRole === 'host' && (
                        <SalePromotionAdmin db={db} appId={appId} properties={properties} popupImage={popupData?.imageUrl}
                            onUpload={uploadFileToCloudinary} validateImage={validateImage}
                            onSave={async data => {
                                if (!checkAccess('host')) throw new Error('Access denied');
                                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_settings', 'sale_promotion'), data);
                            }} />
                    )}

                    {panelTab === 'popup' && (
                        <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-2xl font-light mb-8 border-b pb-4">จัดการหน้าต่างป๊อปอัป</h3>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={popupForm.isActive} onChange={e=>setPopupForm({...popupForm, isActive: e.target.checked})} />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green"></div>
                                        <span className="ml-3 text-sm font-medium text-gray-700">เปิดใช้งานหน้าต่างป๊อปอัป</span>
                                    </label>
                                </div>

                                <div>
                                    <label className="label">รูปภาพโปรโมชั่น (แบนเนอร์)</label>
                                    <div className="w-full max-w-sm h-64 bg-gray-50 rounded-xl relative overflow-hidden group border-2 border-dashed border-gray-300 flex items-center justify-center">
                                        {isUploadingPopup ? (
                                            <Loader className="animate-spin text-brand-green" size={32} />
                                        ) : popupForm.imageUrl ? (
                                            <>
                                                <SmartImage src={getOptimizedImg(popupForm.imageUrl, 600)} className="w-full h-full object-contain" alt="Promotion popup" width={600} height={600} sizes="384px" loading="lazy" decoding="async" />
                                                <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition">
                                                    <Upload size={24} className="mb-2"/> เปลี่ยนรูปภาพ
                                                    <input type="file" accept="image/*" className="hidden" onChange={handlePopupImageUpload} />
                                                </label>
                                            </>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-gray-400 hover:bg-gray-100 transition">
                                                <Upload size={32} className="mb-2"/>
                                                <span className="text-sm">คลิกเพื่ออัปโหลดรูปภาพ</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={handlePopupImageUpload} />
                                            </label>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">แนะนำรูปภาพแนวตั้ง หรือสี่เหลี่ยมจัตุรัส</p>
                                </div>
                                
                                {popupForm.imageUrl && (
                                    <button onClick={() => setPopupForm({...popupForm, imageUrl: ''})} className="mt-4 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition flex items-center gap-2">
                                        <Trash2 size={16}/> ลบรูปภาพป๊อปอัป
                                    </button>
                                )}

                                <div className="pt-6 text-right border-t border-gray-100">
                                    <button onClick={handleSavePopup} disabled={isUploadingPopup || isSaving} className="btn-primary w-full sm:w-auto disabled:opacity-50">{isUploadingPopup ? 'กำลังอัปโหลดรูปภาพ...' : isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {panelTab === 'users' && (
                        <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-2xl font-light mb-8 border-b pb-4">จัดการผู้ดูแลระบบ</h3>
                            <form onSubmit={handleAddUser} className="flex flex-col md:flex-row gap-4 items-start md:items-end mb-8 bg-gray-50 p-6 rounded-xl">
                                <div className="w-full md:flex-1"><label className="label">อีเมล Gmail เท่านั้น</label><input type="email" required className="input-modern" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/></div>
                                <div className="w-full md:w-32"><label className="label">สิทธิ์</label><select className="input-modern" value={inviteRole} onChange={e=>setInviteRole(e.target.value)}><option value="admin">Admin</option><option value="host">Host</option></select></div>
                                <button type="submit" className="btn-primary py-2.5 w-full md:w-auto">เพิ่มสิทธิ์</button>
                            </form>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[500px]">
                                    <thead className="bg-gray-50 text-gray-500 text-sm"><tr><th className="p-4 font-normal">อีเมล</th><th className="p-4 font-normal">สถานะ/สิทธิ์</th><th className="p-4 text-right font-normal">จัดการ</th></tr></thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {users.map(u => (
                                            <tr key={u.id}>
                                                <td className="p-4">{u.id}</td>
                                                <td className="p-4">
                                                    {u.role === 'pending' || !u.role ? (
                                                        <div className="flex gap-2 items-center"><span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs">รออนุมัติ</span><button onClick={()=>handleApproveUser(u.id, 'admin', u.id)} className="text-brand-green hover:underline">อนุมัติ Admin</button></div>
                                                    ) : (
                                                        <select value={u.role} onChange={e=>handleUpdateRole(u.id, e.target.value)} disabled={u.id===HOST_EMAIL} className={`p-1.5 border rounded outline-none text-xs ${u.role==='admin'?'bg-blue-50 text-blue-700 border-blue-200':'bg-brand-light text-brand-green border-brand-green/20'}`}><option value="admin">Admin</option><option value="host">Host</option><option value="pending">ระงับสิทธิ์</option></select>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">{u.id !== HOST_EMAIL && <button onClick={()=>handleRemoveUser(u.id)} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded transition">ลบ</button>}</td>
                                            </tr>
                                        ))}
                                        {users.length === 0 && <tr><td colSpan="3" className="text-center p-8 text-gray-400">ไม่พบข้อมูลผู้ดูแลระบบ</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
