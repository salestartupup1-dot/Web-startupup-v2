import { monthlyMortgage } from '../../lib/mortgage';
import ListingPagination from './ListingPagination';
import { emptyListing, listingHref, listingPage, selectListingProperties, LISTING_PAGE_SIZE } from '../../lib/listingPagination';
import HouseCard, { PAYMENT_NOTE, areaHeadline } from './HouseCard';
/*
 * === คำแนะนำการตั้งค่า Tailwind CSS ===
 * เพื่อให้สีและฟอนต์ (brand-green, brand-light) แสดงผลได้สมบูรณ์แบบ
 * กรุณาเพิ่มการตั้งค่านี้ลงในไฟล์ tailwind.config.js ในโปรเจกต์ของคุณ:
 * * module.exports = {
 * theme: {
 * extend: {
 * colors: { brand: { green: '#0b3d1b', light: '#eef3f0' } },
 * fontFamily: { sans: ['Prompt', 'sans-serif'] },
 * boxShadow: { 'soft': '0 20px 50px -12px rgba(11, 61, 27, 0.15)' }
 * }
 * }
 * }
 */

import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { Home, MapPin, Bed, Bath, Car, Maximize, Phone, MessageCircle, X, Trash2, ShieldCheck, CheckCircle, Calculator, FileText, Edit, Image as ImageIcon, ChevronLeft, ChevronRight, ChevronDown, Upload, XCircle, Loader, Check, FolderPlus, Search, AlertTriangle, AlertCircle, Star, ClipboardCheck, Compass, SlidersHorizontal } from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, addDoc as sdkAddDoc, doc, updateDoc as sdkUpdateDoc, deleteDoc as sdkDeleteDoc, setDoc as sdkSetDoc, serverTimestamp, writeBatch, runTransaction } from 'firebase/firestore';
import { lineContactHref } from '../../lib/lineAttribution';
import { makePropertySlug } from '../../lib/firestorePublic';
import { copyShortShareUrl } from '../../lib/propertyShareClient';
import { getPropertyPath } from '../../lib/seo';
import { matchesSeoLocation, seoLocationFromSearch, locationPath } from '../../lib/seoLocations';
import { firebaseProjectId, useFirebaseEmulator } from '../../lib/firebaseEnvironment';
import { createPublicDataWrites } from '../../lib/publicDataWrites';
import { groupPropertyMapZones, propertyMapZone } from '../../lib/propertyMap';




const firebaseConfig = {
  apiKey: "AIzaSyDsEeGxKA90-URCn06F-K3U2dvlISf_2Jo",
  authDomain: "startup-up-realestate.firebaseapp.com",
  projectId: firebaseProjectId,
  storageBucket: "startup-up-realestate.firebasestorage.app",
  messagingSenderId: "750265634166",
  appId: "1:750265634166:web:a4f6cd0a59db8c685fbe57",
  measurementId: "G-1HZQ3RCXWP"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
// getAuth() would attach the popup/redirect resolver, which loads Firebase's sign-in iframe and
// Google API scripts (~130KB) on every visit. Visitors never sign in, so the resolver is passed
// only to signInWithPopup when an admin opens the Google popup.
const createAuth = () => {
  if (typeof window === 'undefined') return getAuth(app);
  try { return initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] }); }
  catch { return getAuth(app); } // already initialised (hot reload)
};
const auth = createAuth();
if (useFirebaseEmulator && !auth.emulatorConfig) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9097', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8093);
}

const HOST_EMAIL = 'startup.up.real.estate@gmail.com';
const appId = "startup-up-realestate";

const { setDoc, updateDoc, addDoc, deleteDoc } = createPublicDataWrites({
  db, appId, doc, writeBatch, runTransaction, serverTimestamp,
  sdk: { setDoc: sdkSetDoc, updateDoc: sdkUpdateDoc, addDoc: sdkAddDoc, deleteDoc: sdkDeleteDoc },
});

const DEFAULT_COMPANY_INFO = {
  name: 'STARTUP UP',
  address: '39/43 หมู่ 5 ต.คลองสาม อ.คลองหลวง จ.ปทุมธานี 12120',
  phone: '0624782426',
  email: 'startup.up.real.estate@gmail.com',
  line: 'https://line.me/R/ti/p/@SURE141',
  facebook: 'https://www.facebook.com/startupuprealestate/',
  description: 'จุดเริ่มต้นของคนอยากมีบ้าน',
  // Match the saved company logo on the first server-rendered frame as well.
  logoUrl: 'https://res.cloudinary.com/dm2wr55r5/image/upload/v1790151670/pljolp7kwd6ulupq0mvf.png',
  portfolio_years: []
};

const DEFAULT_LOCATIONS_DATA = [
  { area: 'ลำลูกกา', sub_areas: ['คลองหนึ่ง', 'คลองสอง', 'คลองสาม', 'คลองสี่', 'คลองห้า', 'คลองหก', 'คลองเจ็ด', 'คลองแปด', 'คลองเก้า', 'คลองสิบ', 'คลองสิบเอ็ด'], img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { area: 'คลองหลวง', sub_areas: ['คลองหนึ่ง', 'คลองสอง', 'คลองสาม', 'คลองสี่'], img: 'https://images.unsplash.com/photo-1592595896551-12b371d546d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },

  { area: 'ธัญบุรี', sub_areas: ['คลองหนึ่ง', 'คลองสอง', 'คลองสาม', 'คลองสี่', 'คลองห้า', 'คลองหก', 'คลองเจ็ด', 'คลองแปด', 'คลองเก้า', 'คลองสิบ', 'คลองสิบเอ็ด'], img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { area: 'เมืองปทุมธานี', sub_areas: ['บ้านใหม่', 'บางพูน', 'บางกะดี'], img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { area: 'อยุธยา', sub_areas: ['พยอม'], img: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { area: 'สามโคก', sub_areas: [], img: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { area: 'กรุงเทพมหานคร', sub_areas: ['ดอนเมือง', 'บางเขน', 'พหลโยธิน 48', 'พหลโยธิน 52', 'สายไหม'], img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b91d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { area: 'นนทบุรี', sub_areas: ['บางบัวทอง', 'ปากเกร็ด - ติวานนท์', 'ปิ่นเกล้า', 'บางใหญ่'], img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { area: 'สมุทรปราการ', sub_areas: ['บางพลี'], img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' }
];

const DEFAULT_VISUAL_CONTENT = {
  heroTitle: 'STARTUP UP',
  heroSubtitle: 'จุดเริ่มต้นของคนอยากมีบ้าน',
  searchPlaceholder: 'ค้นหาทำเล, ชื่อโครงการ, หรือประเภทบ้าน...',
  heroBgs: [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80'
  ],
  homeTitle: 'ค้นหาบ้านที่ใช่สำหรับคุณ',
  mapTitle: 'ค้นหาทำเลจากแผนที่',
  mapSubtitle: 'คลิกที่ป้ายเพื่อซูมดูรายละเอียดโครงการและบ้านแต่ละหลัง',
  locationTitle: 'ทำเลยอดนิยม',
  calcTitle: 'คำนวณสินเชื่อเบื้องต้น',
  portfolioTitle: 'ผลงานของเรา',
  portfolioEmpty: 'ยังไม่มีรายการผลงานในขณะนี้',
  navHome: 'หน้าหลัก',
  navPromo: 'บ้านโปรโมชั่น',
  navLocation: 'ทำเล',
  navCalc: 'คำนวณสินเชื่อ',
  navPortfolio: 'ผลงาน',
  contactTitle: 'ติดต่อเรา',
  followTitle: 'ติดตามเรา',
  whyUsTitle: 'ซื้อบ้านกับ StartupUp ดีอย่างไร?',
  whyUs1Title: 'One-Stop-Service',
  whyUs1Desc: 'เราดูแลตั้งแต่นัดชมบ้าน จนสิ้นสุดกระบวนการ เมื่อได้ส่งมอบบ้านถึงมือลูกค้า',
  whyUs2Title: 'นัดชมบ้าน',
  whyUs2Desc: 'สามารถนัดชมบ้านกับทีมขายเพื่อให้ลูกค้าได้เลือกบ้านหลังที่ถูกใจที่สุด และตามงบประมาณที่กําหนด',
  whyUs3Title: 'สินเชื่อ',
  whyUs3Desc: 'เรามีทีมงานดูแลเรื่องสินเชื่อให้กับลูกค้าโดยเฉพาะ เพื่อให้ลูกค้าได้รับดอกเบี้ยที่ต่ำ และวงเงินตามที่ต้องการที่สุด',
  whyUs4Title: 'ประเมินราคา',
  whyUs4Desc: 'ทีมฝ่ายขายพร้อมนัดประเมินราคาบ้าน เมื่อลูกค้าผ่านเกณฑ์ตามที่ธนาคารกําหนด เพื่อกําหนดวงเงินในการกู้ต่อไป',
  whyUs5Title: 'โอน / กรมที่ดิน',
  whyUs5Desc: 'ทีมงานดูแล ให้บริการโอน กรรมสิทธิ์ของลูกค้า ณ กรมที่ดิน ให้ราบรื่นที่สุด และใช้ระยะเวลาน้อยที่สุด',
  whyUs6Title: 'ดูแลหลังการขาย',
  whyUs6Desc: 'เรามีการรับประกันหลังการขาย การรั่วซึมต่างๆ รวมถึงตัวบ้านให้สภาพพร้อมเข้าอยู่และใช้งานทุกจุด',
  secTownhouse: 'ทาวน์เฮาส์',
  secTwinhouse: 'บ้านแฝด',
  secSinglehouse: 'บ้านเดี่ยว',
  btnSeeAll: 'ดูทั้งหมด',
  locations: DEFAULT_LOCATIONS_DATA
};

const CATEGORIES = ['ทาวน์เฮาส์', 'ทาวน์เฮาส์ชั้นเดียว', 'ทาวน์เฮาส์หลังริม', 'บ้านแฝด', 'บ้านเดี่ยว'];
const BADGES = [
  { value: '', label: '- ปกติ (ขายทั่วไป) -' },
  { value: 'Promotion', label: 'Promotion (โปรโมชั่น)' },
  { value: 'New', label: 'New (มาใหม่)' },
  { value: 'Sold Out', label: 'Sold Out (ขายแล้ว)' }
];
const DIRECTIONS = ['เหนือ', 'ใต้', 'ตะวันออก', 'ตะวันตก', 'ตะวันออกเฉียงเหนือ', 'ตะวันออกเฉียงใต้', 'ตะวันตกเฉียงเหนือ', 'ตะวันตกเฉียงใต้'];
const COMMON_FACILITIES = ["รปภ. 24 ชม.", "สระว่ายน้ำ", "ฟิตเนส", "สวนสาธารณะ", "กล้อง CCTV", "เข้า-ออก ระบบคีย์การ์ด", "คลับเฮาส์", "สนามเด็กเล่น", "ใกล้ทางด่วน", "ใกล้รถไฟฟ้า", "ใกล้ห้างสรรพสินค้า", "ใกล้โรงเรียน", "ใกล้โรงพยาบาล", "ที่จอดรถส่วนตัว", "ถนนกว้าง", "รีโนเวทใหม่", "พร้อมอยู่"];

const DISTRICT_COORDS = {
  'คลองหลวง': [14.043, 100.655], 'คลองสาม': [14.043, 100.655], 'คลองสอง': [13.985, 100.635],
  'คลองหนึ่ง': [14.015, 100.614], 'คลองสี่': [14.045, 100.685], 'คลองห้า': [14.045, 100.705],
  'คลองหก': [14.045, 100.725], 'คลองเจ็ด': [14.045, 100.745], 'คลองแปด': [14.045, 100.765],
  'คลองเก้า': [14.045, 100.785], 'คลองสิบ': [14.045, 100.805], 'คลองสิบเอ็ด': [14.045, 100.825],
  'ธัญบุรี': [14.000, 100.680], 'ลำลูกกา': [13.935, 100.655], 'ลาดสวาย': [13.935, 100.675],
  'สามโคก': [14.090, 100.564], 'ปิ่นเกล้า': [13.762, 100.486],
  'เมืองปทุมธานี': [13.990, 100.525], 'ดอนเมือง': [13.923, 100.597], 'บางเขน': [13.871, 100.600],
  'สายไหม': [13.921, 100.642], 'พหลโยธิน 48': [13.882, 100.606], 'พหลโยธิน 52': [13.893, 100.611],
  'บางบัวทอง': [13.915, 100.418], 'ปากเกร็ด': [13.912, 100.498], 'ติวานนท์': [13.884, 100.518], 'บางใหญ่': [13.850, 100.475],
  'รังสิต': [13.985, 100.615], 'พยอม': [14.1401, 100.6402], 'อยุธยา': [14.353, 100.568],
  'วังน้อย': [14.225, 100.718], 'นนทบุรี': [13.859, 100.521], 'กรุงเทพมหานคร': [13.756, 100.501], 'สมุทรปราการ': [13.595, 100.694], 'บางพลี': [13.595, 100.694],
  'บ้านใหม่': [13.957, 100.545], 'บางพูน': [13.978, 100.575], 'บางกะดี': [13.984, 100.548]
};

/**
 * พิกัดสำรองของทำเลย่อย แยกตามทำเลหลัก
 *
 * ชื่อคลองซ้ำกันหลายอำเภอ (คลองหนึ่งมีทั้งคลองหลวง ธัญบุรี และลำลูกกา) ถ้าอ้างแต่ชื่อคลอง
 * บ้านที่ยังไม่ได้กรอก lat/lng จะถูกวางหมุดผิดอำเภอ — เช่นคลองหนึ่งคลองหลวงไปโผล่ที่คลองหนึ่งธัญบุรี
 * ตัวเลขได้จากค่ากลางของบ้านที่มีพิกัดจริงในแต่ละทำเล แล้วไล่ตามแนวคลองสำหรับคลองที่ยังไม่มีบ้าน
 */
const AREA_SUB_COORDS = {
  'คลองหลวง': {
    'คลองหนึ่ง': [14.075, 100.626], 'คลองสอง': [14.058, 100.642],
    'คลองสาม': [14.032, 100.666], 'คลองสี่': [14.030, 100.687]
  },
  'ธัญบุรี': {
    'คลองหนึ่ง': [13.977, 100.631], 'คลองสอง': [13.985, 100.653],
    'คลองสาม': [13.993, 100.675], 'คลองสี่': [14.001, 100.697],
    'คลองห้า': [14.008, 100.719], 'คลองหก': [14.016, 100.741],
    'คลองเจ็ด': [14.024, 100.763], 'คลองแปด': [14.032, 100.785],
    'คลองเก้า': [14.040, 100.807], 'คลองสิบ': [14.047, 100.830],
    'คลองสิบเอ็ด': [14.055, 100.852]
  },
  'ลำลูกกา': {
    'คลองหนึ่ง': [13.958, 100.634], 'คลองสอง': [13.959, 100.654],
    'คลองสาม': [13.957, 100.671], 'คลองสี่': [13.967, 100.683],
    'คลองห้า': [13.955, 100.714], 'คลองหก': [13.951, 100.734],
    'คลองเจ็ด': [13.955, 100.750], 'คลองแปด': [13.954, 100.775],
    'คลองเก้า': [13.952, 100.795], 'คลองสิบ': [13.950, 100.815],
    'คลองสิบเอ็ด': [13.948, 100.835]
  },
  'เมืองปทุมธานี': {
    'บ้านใหม่': [13.957, 100.545], 'บางพูน': [13.986, 100.572], 'บางกะดี': [13.990, 100.542]
  },
  'กรุงเทพมหานคร': {
    'ดอนเมือง': [13.927, 100.568], 'บางเขน': [13.871, 100.600],
    'พหลโยธิน 48': [13.878, 100.610], 'พหลโยธิน 52': [13.889, 100.628],
    'สายไหม': [13.924, 100.647]
  },
  'นนทบุรี': {
    'บางบัวทอง': [13.915, 100.418], 'ปากเกร็ด - ติวานนท์': [13.948, 100.543],
    'ปิ่นเกล้า': [13.762, 100.486], 'บางใหญ่': [13.851, 100.388]
  },
  'อยุธยา': { 'พยอม': [14.155, 100.634] },
  'สมุทรปราการ': { 'บางพลี': [13.562, 100.723] }
};

const getAreaSubCoords = (area, sub) => ((area && sub && AREA_SUB_COORDS[area]) ? AREA_SUB_COORDS[area][sub] : null) || null;

// ทำเลหลัก: ยึด main_location ก่อน รายการเก่าที่ยังไม่มีค่อยถอยไปดู district/subdistrict
const matchesMainArea = (p, area) => {
  if (!area) return false;
  if (p.main_location) return p.main_location === area;
  return p.district === area || p.subdistrict === area || (p.subdistrict === 'คูคต' && area === 'ลำลูกกา');
};

// ทำเลย่อย: ต้องเทียบคู่กับทำเลหลักด้วยเสมอ เพราะชื่อคลองซ้ำกันหลายอำเภอ
const matchesSubArea = (p, sub) => {
  if (!sub) return false;
  return p.sub_location ? p.sub_location === sub : p.subdistrict === sub;
};

/**
 * ข้อมูลทำเลมาจาก Firestore (แก้ได้จากโหมดแก้ไขหน้าเว็บ) ถ้ารูปร่างข้อมูลเพี้ยน — ไม่ใช่อาเรย์
 * หรือมีรายการที่ไม่มี sub_areas — การ .map() จะพังทั้งหน้าจนกลายเป็นจอขาว เลยล้างให้ปลอดภัยก่อนใช้
 */
const normalizeLocations = (locations) => {
  const list = Array.isArray(locations) && locations.length ? locations : DEFAULT_LOCATIONS_DATA;
  return list
    .filter(loc => loc && loc.area)
    .map(loc => ({ ...loc, sub_areas: Array.isArray(loc.sub_areas) ? loc.sub_areas.filter(Boolean) : [] }));
};

/**
 * ทำเลที่ไม่ต้องการโชว์ให้ลูกค้าเห็น (การ์ดทำเลหน้าแรกและหน้าทำเล)
 * ยังเก็บไว้ในข้อมูลเหมือนเดิม หลังบ้านจึงยังเลือกทำเลนี้ให้บ้านที่ลงไว้แล้วได้
 */
const HIDDEN_LOCATION_AREAS = ['สามโคก', 'สมุทรปราการ'];

/**
 * กรองทำเลที่ซ่อนไว้ออกจากการแสดงผล แต่ยังพก srcIdx ซึ่งเป็นตำแหน่งจริงใน
 * visualContent.locations ติดไปด้วย เพราะปุ่มเปลี่ยน/ลบรูปในโหมดแก้ไขอ้างอิงตำแหน่งนั้น
 */
const visibleLocations = (locations) => locations
    .map((loc, srcIdx) => ({ ...loc, srcIdx }))
    .filter(loc => !HIDDEN_LOCATION_AREAS.includes(loc.area));

const searchResultHref = (type, value, area) => {
  const location = seoLocationFromSearch({ type, value });
  if (location) return locationPath(location);
  const params = new URLSearchParams({ tab: 'search_result', sType: type, sValue: value });
  if (area) params.set('sArea', area);
  return `/?${params.toString()}`;
};

const TRANSIT_LINES = [
    {
        id: 'red-dark',
        name: 'SRT สายสีแดงเข้ม',
        color: '#E02424',
        stations: [
            { id: 'RN10', name: 'รังสิต', lat: 13.9870, lng: 100.5975 },
            { id: 'RN09', name: 'หลักหก', lat: 13.9634, lng: 100.5937 },
            { id: 'RN08', name: 'ดอนเมือง', lat: 13.9224, lng: 100.5997 },
            { id: 'RN07', name: 'การเคหะ', lat: 13.9056, lng: 100.5898 },
            { id: 'RN06', name: 'หลักสี่', lat: 13.8828, lng: 100.5824 },
            { id: 'RN05', name: 'ทุ่งสองห้อง', lat: 13.8705, lng: 100.5752 },
            { id: 'RN04', name: 'บางเขน', lat: 13.8475, lng: 100.5596 },
            { id: 'RN03', name: 'วัดเสมียนนารี', lat: 13.8378, lng: 100.5539 },
            { id: 'RN02', name: 'จตุจักร', lat: 13.8260, lng: 100.5458 },
            { id: 'RN01', name: 'บางซื่อ (Krung Thep Aphiwat)', lat: 13.8048, lng: 100.5398 }
        ]
    },
    {
        id: 'green-north',
        name: 'BTS สายสีเขียว',
        color: '#059669',
        stations: [
            { id: 'N24', name: 'คูคต', lat: 13.9317, lng: 100.6450 },
            { id: 'N23', name: 'แยก คปอ.', lat: 13.9234, lng: 100.6265 },
            { id: 'N22', name: 'พิพิธภัณฑ์กองทัพอากาศ', lat: 13.9168, lng: 100.6225 },
            { id: 'N21', name: 'โรงพยาบาลภูมิพลอดุลยเดช', lat: 13.9061, lng: 100.6152 },
            { id: 'N20', name: 'สะพานใหม่', lat: 13.8960, lng: 100.6086 },
            { id: 'N19', name: 'สายหยุด', lat: 13.8860, lng: 100.6022 },
            { id: 'N18', name: 'พหลโยธิน 59', lat: 13.8798, lng: 100.5982 },
            { id: 'N17', name: 'วัดพระศรีมหาธาตุ', lat: 13.8741, lng: 100.5960 },
            { id: 'N16', name: 'กรมทหารราบที่ 11', lat: 13.8647, lng: 100.5901 },
            { id: 'N15', name: 'บางบัว', lat: 13.8557, lng: 100.5847 },
            { id: 'N14', name: 'กรมป่าไม้', lat: 13.8471, lng: 100.5794 },
            { id: 'N13', name: 'มหาวิทยาลัยเกษตรศาสตร์', lat: 13.8407, lng: 100.5752 },
            { id: 'N12', name: 'เสนานิคม', lat: 13.8327, lng: 100.5721 },
            { id: 'N11', name: 'รัชโยธิน', lat: 13.8266, lng: 100.5683 },
            { id: 'N10', name: 'พหลโยธิน 24', lat: 13.8202, lng: 100.5645 },
            { id: 'N9', name: 'ห้าแยกลาดพร้าว', lat: 13.8142, lng: 100.5606 }
        ]
    },
    {
        id: 'pink',
        name: 'MRT สายสีชมพู',
        color: '#EC4899',
        stations: [
            { id: 'PK01', name: 'ศูนย์ราชการนนทบุรี', lat: 13.8601, lng: 100.5134 },
            { id: 'PK02', name: 'แคราย', lat: 13.8624, lng: 100.5222 },
            { id: 'PK03', name: 'สนามบินน้ำ', lat: 13.8732, lng: 100.5186 },
            { id: 'PK04', name: 'สามัคคี', lat: 13.8825, lng: 100.5147 },
            { id: 'PK05', name: 'กรมชลประทาน', lat: 13.8967, lng: 100.5090 },
            { id: 'PK06', name: 'แยกปากเกร็ด', lat: 13.9056, lng: 100.5042 },
            { id: 'PK07', name: 'เลี่ยงเมืองปากเกร็ด', lat: 13.9048, lng: 100.5195 },
            { id: 'PK08', name: 'แจ้งวัฒนะ-ปากเกร็ด 28', lat: 13.9042, lng: 100.5310 },
            { id: 'PK09', name: 'ศรีรัช', lat: 13.9026, lng: 100.5401 },
            { id: 'PK10', name: 'เมืองทองธานี', lat: 13.8996, lng: 100.5478 },
            { id: 'PK11', name: 'แจ้งวัฒนะ 14', lat: 13.8953, lng: 100.5576 },
            { id: 'PK12', name: 'ศูนย์ราชการเฉลิมพระเกียรติ', lat: 13.8913, lng: 100.5654 },
            { id: 'PK13', name: 'โทรคมนาคมแห่งชาติ', lat: 13.8885, lng: 100.5732 },
            { id: 'PK14', name: 'หลักสี่', lat: 13.8828, lng: 100.5824 },
            { id: 'PK16', name: 'วัดพระศรีมหาธาตุ', lat: 13.8741, lng: 100.5960 },
            { id: 'PK17', name: 'รามอินทรา 3', lat: 13.8702, lng: 100.6094 }
        ]
    },
    {
        id: 'purple',
        name: 'MRT สายสีม่วง',
        color: '#8B5CF6',
        stations: [
            { id: 'PP01', name: 'คลองบางไผ่', lat: 13.8916, lng: 100.4087 },
            { id: 'PP02', name: 'ตลาดบางใหญ่', lat: 13.8794, lng: 100.4137 },
            { id: 'PP03', name: 'สามแยกบางใหญ่', lat: 13.8702, lng: 100.4150 },
            { id: 'PP04', name: 'บางพลู', lat: 13.8744, lng: 100.4357 },
            { id: 'PP05', name: 'บางรักใหญ่', lat: 13.8773, lng: 100.4468 },
            { id: 'PP06', name: 'บางรักน้อยท่าอิฐ', lat: 13.8752, lng: 100.4578 },
            { id: 'PP07', name: 'ไทรม้า', lat: 13.8718, lng: 100.4706 },
            { id: 'PP08', name: 'สะพานพระนั่งเกล้า', lat: 13.8715, lng: 100.4812 },
            { id: 'PP09', name: 'แยกนนทบุรี 1', lat: 13.8647, lng: 100.4907 },
            { id: 'PP10', name: 'บางกระสอ', lat: 13.8623, lng: 100.5028 },
            { id: 'PP11', name: 'ศูนย์ราชการนนทบุรี', lat: 13.8601, lng: 100.5134 }
        ]
    }
];

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dm2wr55r5/image/upload';
const CLOUDINARY_PRESET = 'my_house_preset';

const uploadFileToCloudinary = async (file) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  try {
      const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: fd });
      const data = await response.json();
      if (data.secure_url) return data.secure_url;
      else throw new Error(data.error?.message || "อัปโหลดไม่สำเร็จ");
  } catch (error) { throw error; }
};

/**
 * format:
 *   'auto' (ค่าเริ่มต้น) ให้ Cloudinary เลือก webp/avif ที่เบาที่สุดตามเบราว์เซอร์ ใช้กับรูปทั่วทั้งหน้าเว็บ
 *   'jpg'  บังคับเป็น .jpg ใช้เฉพาะไลท์บ็อกซ์ เพื่อให้คลิกขวาเซฟแล้วได้ไฟล์ที่เปิด/ส่งต่อได้ทุกที่
 */
const getOptimizedImg = (url, width = 800, format = 'auto') => {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('cloudinary.com')) {
      const f = format === 'jpg' ? 'f_jpg' : 'f_auto';
      return url.replace('/upload/', `/upload/${f},q_auto,w_${width},c_limit/`);
  }
  if (url.includes('images.unsplash.com')) {
      try {
          const optimizedUrl = new URL(url);
          optimizedUrl.searchParams.set('auto', 'format');
          optimizedUrl.searchParams.set('fit', optimizedUrl.searchParams.get('fit') || 'crop');
          optimizedUrl.searchParams.set('w', String(width));
          optimizedUrl.searchParams.set('q', width > 1000 ? '75' : '70');
          return optimizedUrl.toString();
      } catch (error) {
          return url;
      }
  }
  return url;
};

const preloadedImageUrls = new Set();

const preloadImage = (url, width = 1200, format = 'auto') => {
  if (typeof window === 'undefined' || !url) return;
  const src = getOptimizedImg(url, width, format);
  if (!src || preloadedImageUrls.has(src)) return;
  preloadedImageUrls.add(src);
  const img = new window.Image();
  img.decoding = 'async';
  img.src = src;
};

const preloadImagesAround = (images, currentIndex, width = 1200, radius = 1, format = 'auto') => {
  if (typeof window === 'undefined' || !Array.isArray(images) || images.length === 0) return;
  const targets = new Set([currentIndex]);
  for (let offset = 1; offset <= radius; offset += 1) {
      targets.add((currentIndex + offset) % images.length);
      targets.add((currentIndex - offset + images.length) % images.length);
  }
  targets.forEach(index => preloadImage(images[index], width, format));
};

function SmartImage({
  src,
  alt = '',
  className = '',
  priority = false,
  style,
  ...props
}) {
  const safeSrc = src || 'https://placehold.co/600x400';
  // Use a plain img so Cloudinary/CDN optimized URLs load directly without Next's image proxy delay.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={safeSrc} alt={alt} className={className} style={style} fetchPriority={priority ? 'high' : undefined} {...props} />;
}

function SoldOutRibbon({ size = 'md' }) {
  const sizeClass = size === 'sm' ? 'sold-out-ribbon-sm' : size === 'lg' ? 'sold-out-ribbon-lg' : '';
  return (
    <div className={`sold-out-ribbon ${sizeClass}`} aria-label="Sold out">
      <span>SOLD OUT</span>
    </div>
  );
}

const validateImage = (file) => {
  if (!file || !file.type) return false;
  if (!file.type.startsWith('image/')) {
      throw new Error('กรุณาอัปโหลดเฉพาะไฟล์รูปภาพเท่านั้น');
  }
  if (file.size > 5 * 1024 * 1024) {
      throw new Error('ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB');
  }
  return true;
};

const getYoutubeId = (url) => {
  if (!url || typeof url !== 'string') return null;
  let str = url.trim();
  const srcMatch = str.match(/src=["']([^"']+)["']/);
  if (srcMatch) str = srcMatch[1];
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = str.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const normalizeThaiSearch = (text) => {
  if (!text) return '';
  return text.toLowerCase()
             .replace(/1/g, 'หนึ่ง').replace(/2/g, 'สอง').replace(/3/g, 'สาม')
             .replace(/4/g, 'สี่').replace(/5/g, 'ห้า').replace(/6/g, 'หก')
             .replace(/7/g, 'เจ็ด').replace(/8/g, 'แปด').replace(/9/g, 'เก้า')
             .replace(/0/g, 'ศูนย์').replace(/\s+/g, '');
};

const generatePropSlug = (p) => {
  return makePropertySlug(p);
};

const getPropertySharePath = (property) => {
  return getPropertyPath(property);
};

// --- Lightbox Component ---
function Lightbox({ isOpen, images, startIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex || 0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
      if (isOpen) setCurrentIndex(startIndex || 0);
  }, [isOpen, startIndex]);

  useEffect(() => {
      if (!isOpen) return;
      // ไลท์บ็อกซ์ใช้ .jpg เพื่อให้เซฟรูปได้สะดวก ต้อง preload ด้วย URL เดียวกัน ไม่งั้นโหลดซ้ำสองรอบ
      preloadImagesAround(images, currentIndex, 1600, 1, 'jpg');
  }, [isOpen, images, currentIndex]);

  useEffect(() => {
      if (isOpen) document.body.style.overflow = 'hidden';
      else document.body.style.overflow = 'unset';
      return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !images || images.length === 0) return null;

  const nextImg = (e) => { if(e) e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % images.length); };
  const prevImg = (e) => { if(e) e.stopPropagation(); setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1)); };

  // ระบบใช้นิ้วปัด (Swipe)
  const handleTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEndAction = () => {
      if (!touchStart || !touchEnd) return;
      if (touchStart - touchEnd > 75) nextImg(); // ปัดซ้าย (ไปรูปถัดไป)
      if (touchStart - touchEnd < -75) prevImg(); // ปัดขวา (กลับรูปเดิม)
      setTouchStart(0); setTouchEnd(0);
  };

  return (
      <div 
        className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center backdrop-blur-md animate-in fade-in duration-200" 
        onClick={onClose}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEndAction}
      >
          <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 text-white/70 hover:text-white z-50 p-2 bg-black/20 rounded-full transition"><X size={32}/></button>
          
          <div className="relative w-full max-w-6xl h-full flex items-center justify-center p-4 md:p-8">
              <SmartImage 
                  src={getOptimizedImg(images[currentIndex], 1600, 'jpg')} 
                  alt={`Image ${currentIndex + 1}`} 
                  width={1600}
                  height={1200}
                  sizes="100vw"
                  priority
                  className="max-w-full max-h-full object-contain rounded-md shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200"
                  decoding="async"
                  onClick={(e) => e.stopPropagation()} 
              />
              
              {images.length > 1 && (
                  <>
                      <button onClick={prevImg} className="absolute left-4 md:left-8 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 p-3 md:p-4 rounded-full transition z-50 shadow-lg hover:scale-110 hidden md:block">
                          <ChevronLeft size={32} />
                      </button>
                      <button onClick={nextImg} className="absolute right-4 md:right-8 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 p-3 md:p-4 rounded-full transition z-50 shadow-lg hover:scale-110 hidden md:block">
                          <ChevronRight size={32} />
                      </button>
                      <div className="absolute bottom-6 md:bottom-10 text-white font-medium text-sm bg-black/60 backdrop-blur px-5 py-2 rounded-full tracking-widest shadow-lg">
                          {currentIndex + 1} / {images.length}
                      </div>
                  </>
              )}
          </div>
      </div>
  );
}

// --- EditableText Component ---
// className defaults to '' — the menu calls this without one, and opening the editor ran
// className.replace() on undefined, which crashed the whole page.
function EditableText({ tag: Tag = 'span', fieldKey, content, updateContent, isEditMode, className = '' }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState('');

  useEffect(() => { 
      if (content && content[fieldKey] !== undefined) {
          setTempVal(content[fieldKey]); 
      }
  }, [content, fieldKey]);

  if (!content || content[fieldKey] === undefined) return null;

  if (!isEditMode) return <Tag className={className}>{content[fieldKey]}</Tag>;

  if (isEditing) {
      return <input 
          autoFocus 
          className={`bg-white text-black border-2 border-blue-500 rounded px-2 py-1 w-full max-w-md shadow-lg outline-none relative z-50 ${className.replace(/text-white|text-brand-light|text-gray-\d+/g, 'text-gray-800')}`} 
          value={tempVal} 
          onChange={e => setTempVal(e.target.value)}
          onBlur={() => {
              setIsEditing(false);
              if (tempVal !== content[fieldKey]) updateContent({ ...content, [fieldKey]: tempVal });
          }}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
      />
  }

  return (
      <Tag className={`${className} relative group inline-flex items-center`}>
          <span>{content[fieldKey]}</span>
          <span
              data-edit-control
              onPointerDown={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  setIsEditing(true); 
              }}
              className="ml-2 inline-flex items-center justify-center bg-blue-100 text-blue-600 p-1.5 rounded-full shadow hover:bg-blue-600 hover:text-white transition-colors cursor-pointer align-middle"
              title="คลิกเพื่อแก้ไขข้อความ"
              style={{ zIndex: 50, pointerEvents: 'auto' }}
          >
              <Edit size={14} />
          </span>
      </Tag>
  );
}

// --- HeroSection Component ---
function HeroSection({ visualContent, updateVisualContent, isEditMode }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  const heroBgs = useMemo(() => {
      if (Array.isArray(visualContent?.heroBgs) && visualContent.heroBgs.length > 0) return visualContent.heroBgs;
      if (visualContent?.heroBg) return [visualContent.heroBg];
      return DEFAULT_VISUAL_CONTENT.heroBgs;
  }, [visualContent]);
  const heroImg = heroBgs[currentIndex] || heroBgs[0];

  const nextSlide = () => setCurrentIndex(prev => (prev + 1) % heroBgs.length);
  const prevSlide = () => setCurrentIndex(prev => (prev === 0 ? heroBgs.length - 1 : prev - 1));

  useEffect(() => {
      if (heroBgs.length <= 1) return;
      // ตอนแก้ไขหน้าเว็บ ให้หยุดเลื่อนอัตโนมัติ จะได้กดเลือกรูปที่จะลบได้
      if (isEditMode) return;
      const interval = setInterval(() => {
          setCurrentIndex(prev => (prev + 1) % heroBgs.length);
      }, 5000);
      return () => clearInterval(interval);
  }, [heroBgs.length, isEditMode]);

  useEffect(() => {
      if (currentIndex > heroBgs.length - 1) setCurrentIndex(0);
  }, [heroBgs.length, currentIndex]);

  useEffect(() => {
      preloadImagesAround(heroBgs, currentIndex, 1600, 1);
  }, [heroBgs, currentIndex]);

  const handleTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEndAction = () => {
      if (!touchStart || !touchEnd) return;
      if (touchStart - touchEnd > 75) nextSlide();
      if (touchStart - touchEnd < -75) prevSlide();
      setTouchStart(0);
      setTouchEnd(0);
  };

  const handleAddFile = async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      try {
          validateImage(file);
          const url = await uploadFileToCloudinary(file);
          updateVisualContent({ ...visualContent, heroBgs: [...heroBgs, url] });
      } catch(err) {
          alert("Upload failed: " + err.message);
      }
  };
  
  const handleRemoveCurrent = () => {
      if(heroBgs.length <= 1) {
          alert("ต้องมีอย่างน้อย 1 รูปครับ"); return;
      }
      const newBgs = heroBgs.filter((_, i) => i !== currentIndex);
      updateVisualContent({ ...visualContent, heroBgs: newBgs });
      setCurrentIndex(Math.min(currentIndex, newBgs.length - 1));
  };

  return (
      <div className="w-full flex flex-col bg-white">
          <div className="w-full text-center px-6 py-10 md:py-16 bg-white z-10 relative">
              <EditableText tag="h1" fieldKey="heroTitle" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-3xl md:text-4xl font-medium text-brand-green tracking-wide mb-3 inline-block reveal-on-scroll" />
              <br/>
              <EditableText tag="p" fieldKey="heroSubtitle" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-gray-500 font-light tracking-[0.2em] uppercase text-xs md:text-sm inline-block reveal-on-scroll delay-100" />
          </div>

          <div 
              className="relative w-full flex flex-col items-center justify-center overflow-hidden bg-white group"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEndAction}
          >
              <div className="relative w-full">
                  <SmartImage 
                      key={heroImg}
                      src={getOptimizedImg(heroImg, 1600)} 
                      alt={`ภาพบ้านและบรรยากาศ STARTUP UP ภาพที่ ${currentIndex + 1}`}
                      width={1600}
                      height={900}
                      sizes="100vw"
                      priority
                      className="relative z-10 w-full h-auto block transition-opacity duration-700 ease-in-out" 
                      decoding="async"
                  />
              </div>
              
              {heroBgs.length > 1 && (
                  <>
                      <button onClick={prevSlide} className={`absolute left-4 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white text-brand-green p-3 rounded-full transition-all duration-300 shadow-md z-30 ${isEditMode ? 'opacity-100 bg-white' : 'opacity-0 group-hover:opacity-100'}`}>
                          <ChevronLeft size={24} />
                      </button>
                      <button onClick={nextSlide} className={`absolute right-4 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white text-brand-green p-3 rounded-full transition-all duration-300 shadow-md z-30 ${isEditMode ? 'opacity-100 bg-white' : 'opacity-0 group-hover:opacity-100'}`}>
                          <ChevronRight size={24} />
                      </button>
                      
                      <div className="absolute bottom-6 flex items-center gap-2 z-30">
                          {heroBgs.map((_, idx) => (
                              <button key={idx} onClick={() => setCurrentIndex(idx)} className={`rounded-full transition-all duration-300 ${isEditMode ? 'h-3.5' : 'h-2.5'} ${idx === currentIndex ? (isEditMode ? 'bg-white w-7 ring-2 ring-brand-green' : 'bg-white w-6') : `bg-white/50 hover:bg-white/80 ${isEditMode ? 'w-3.5 ring-1 ring-black/20' : 'w-2.5'}`}`} />
                          ))}
                      </div>
                  </>
              )}
              
              {isEditMode && (
                  <div className="absolute top-4 right-4 z-50 flex gap-2">
                      <label className="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 shadow hover:bg-blue-700 transition text-sm">
                          <Upload size={16} /> เพิ่มรูปสไลด์
                          <input type="file" accept="image/*" className="hidden" onChange={handleAddFile} />
                      </label>
                      <button onClick={handleRemoveCurrent} className="bg-red-600 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 shadow hover:bg-red-700 transition text-sm">
                          <Trash2 size={16} /> ลบรูปนี้ ({currentIndex + 1}/{heroBgs.length})
                      </button>
                  </div>
              )}
          </div>
      </div>
  );
}

// --- Map Utility ---
const getSafeCoords = (p) => {
  let rawLat = p.lat ? String(p.lat).replace(/,/g, '.').replace(/\s/g, '') : '';
  let rawLng = p.lng ? String(p.lng).replace(/,/g, '.').replace(/\s/g, '') : '';
  let lat = parseFloat(rawLat);
  let lng = parseFloat(rawLng);
  if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat > 25 || lat < 5 || lng < 90 || lng > 110) {
      const projName = String(p.project_name || '').toLowerCase();
      if (projName.includes('พฤกษา') && projName.includes('72')) { return { lat: 14.1428, lng: 100.6475 }; }
      if (projName.includes('พฤกษา') && projName.includes('109')) { return { lat: 14.1485, lng: 100.6448 }; }

      const subLoc = String(p.sub_location || '').trim();
      const subDist = String(p.subdistrict || '').trim();
      const mainLoc = String(p.main_location || '').trim();
      const dist = String(p.district || '').trim();

      // ไล่จากละเอียดไปหยาบ: ทำเลหลัก+ย่อย -> ทำเลหลัก -> ชื่อทำเลย่อยเดี่ยวๆ (ของเก่า)
      // ถ้าไม่รู้จักคู่ทำเลหลัก+ย่อย ให้ลงที่กลางอำเภอดีกว่าไปลงคลองชื่อเดียวกันของอำเภออื่น
      const fallback = getAreaSubCoords(mainLoc, subLoc)
          || getAreaSubCoords(mainLoc, subDist)
          || getAreaSubCoords(dist, subLoc)
          || getAreaSubCoords(dist, subDist)
          || DISTRICT_COORDS[mainLoc]
          || DISTRICT_COORDS[dist]
          || DISTRICT_COORDS[subLoc]
          || DISTRICT_COORDS[subDist]
          || [14.020, 100.650];
      lat = fallback[0];
      lng = fallback[1];
  }
  return { lat, lng };
};

// --- PropertyMap Component ---
/**
 * แผนที่หมุดโครงการ
 *
 * @param variant  'section' = กล่องแผนที่ปกติกลางหน้า (ค่าเริ่มต้น)
 *                 'story'   = ฝังอยู่ในฉากภาพยนตร์ที่เลื่อนหน้าจอเล่นเรื่อง
 *
 * โหมด story ต่างตรงที่ปิดการลากแผนที่บนจอสัมผัส เพราะฉากนั้นเป็นแบบ sticky
 * นิ้วที่ลากแผนที่จะทำให้หน้าเลื่อนต่อไม่ได้ กลายเป็นติดกับดัก
 * กดป้าย "N โครงการ" และซูมด้วยปุ่ม +/- หรือลูกกลิ้งเมาส์ได้
 * Leaflet รับลูกกลิ้งเฉพาะภายในแผนที่ ส่วนด้านนอกยังเลื่อนหน้าเว็บตามปกติ
 */
function PropertyMap({ properties, onSelectProp, variant = 'section' }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);
  const expandedZone = useRef(null);
  const expandedProject = useRef(null);

  useEffect(() => {
      if (!mapRef.current) return;
      
      let cancelled = false;
      const initMap = async () => {
          let L;
          try {
              L = (await import('leaflet')).default;
          } catch (error) {
              console.warn('Unable to load Leaflet map bundle:', error);
              return;
          }

          if (cancelled || !mapRef.current) return;

          if (!mapInstance.current) {
              const isTouch = typeof window !== 'undefined'
                  && window.matchMedia('(hover: none)').matches;

              mapInstance.current = L.map(mapRef.current, {
                  center: [13.980, 100.615],
                  zoom: 11,
                  scrollWheelZoom: true,
                  // ในฉากภาพยนตร์บนจอสัมผัส ห้ามลากแผนที่ ไม่งั้นเลื่อนหน้าต่อไม่ได้
                  dragging: !(variant === 'story' && isTouch)
              });

              // Match Stock Map's road, building and place-name detail at every zoom level.
              L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
                  maxZoom: 19,
                  referrerPolicy: 'strict-origin-when-cross-origin',
                  updateWhenIdle: true,
                  keepBuffer: 1,
              }).addTo(mapInstance.current);

              TRANSIT_LINES.forEach(line => {
                  const lineCoords = line.stations.map(st => [st.lat, st.lng]);
                  L.polyline(lineCoords, { color: line.color, weight: 6, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(mapInstance.current);

                  if(line.stations) {
                      line.stations.forEach(st => {
                          L.circleMarker([st.lat, st.lng], { radius: 5, fillColor: 'white', color: line.color, weight: 2, fillOpacity: 1 })
                           .bindTooltip(st.name, { permanent: false, direction: 'top', offset: [0, -5], className: 'font-sans font-medium text-gray-700 text-[12px] px-2 py-1 border-gray-100 shadow-md' })
                           .addTo(mapInstance.current);
                      });
                  }
              });

              markersLayer.current = L.layerGroup().addTo(mapInstance.current);

              const BackControl = L.Control.extend({
                  options: { position: 'topright' },
                  onAdd: function () {
                      const div = L.DomUtil.create('div', 'bg-white px-4 py-2 mt-4 mr-4 rounded-xl shadow-lg cursor-pointer text-brand-green font-bold text-[13px] border-2 border-brand-green hover:bg-brand-green hover:text-white transition');
                      div.id = 'map-back-btn';
                      div.style.display = 'none';
                      div.innerHTML = '← ย้อนกลับดูโครงการทั้งหมด';
                      return div;
                  }
              });
              mapInstance.current.addControl(new BackControl());
          }

          const map = mapInstance.current;
          const layerGroup = markersLayer.current;
          const zones = groupPropertyMapZones(properties, getSafeCoords);
          const markerIcon = (text, house = false) => {
              const pill = document.createElement('div');
              pill.className = `property-map-pill${house ? ' is-house' : ''}`;
              const dot = document.createElement('span');
              dot.className = 'property-map-dot';
              dot.setAttribute('aria-hidden', 'true');
              const label = document.createElement('span');
              label.textContent = text;
              pill.append(dot, label);
              return L.divIcon({ className: 'property-map-icon', html: pill, iconSize: null, iconAnchor: [18, 14] });
          };

          const createPopupItem = (p) => {
              const itemDiv = document.createElement('div');
              itemDiv.className = 'flex items-start gap-3 mb-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition';
              
              const img = document.createElement('img');
              img.src = getOptimizedImg(p.images?.[0] || p.imageUrl || "https://placehold.co/100x100", 150);
              img.className = 'w-16 h-16 object-cover rounded-md flex-shrink-0';
              
              const infoDiv = document.createElement('div');
              const name = document.createElement('div');
              name.className = 'font-medium text-sm text-gray-800 line-clamp-1';
              name.innerText = p.house_number ? `เลขที่ ${p.house_number}` : (p.project_name || 'ไม่ระบุชื่อโครงการ');
              
              const price = document.createElement('div');
              price.className = 'text-brand-green text-xs font-bold mt-1';
              price.innerText = `฿ ${Number(String(p.price || 0).replace(/,/g, '')).toLocaleString()}`;
              
              infoDiv.appendChild(name); infoDiv.appendChild(price);
              itemDiv.appendChild(img); itemDiv.appendChild(infoDiv);

              itemDiv.onclick = () => { map.closePopup(); onSelectProp(p); };
              return itemDiv;
          };

          const drawMap = () => {
              layerGroup.clearLayers();
              const validProps = properties.filter(p => p.badge !== 'Sold Out');
              const backBtn = document.getElementById('map-back-btn');

              if (expandedProject.current) {
                  if (backBtn) {
                      backBtn.style.display = 'block';
                      backBtn.innerHTML = '← ย้อนกลับดูชื่อโครงการ';
                      backBtn.onclick = (e) => {
                          L.DomEvent.stopPropagation(e);
                          expandedProject.current = null;
                          drawMap();
                      };
                  }
              } else if (expandedZone.current) {
                  if (backBtn) {
                      backBtn.style.display = 'block';
                      backBtn.innerHTML = '← ย้อนกลับดูแผนที่รวม';
                      backBtn.onclick = (e) => {
                          L.DomEvent.stopPropagation(e);
                          expandedZone.current = null;
                          drawMap();
                      };
                  }
              } else {
                  if (backBtn) backBtn.style.display = 'none';
              }

              const bounds = [];

              if (expandedZone.current && expandedProject.current) {
                  const houses = validProps.filter(p => 
                      propertyMapZone(p).key === expandedZone.current &&
                      ((p.project_name || '').trim() || 'ไม่ระบุชื่อโครงการ') === expandedProject.current
                  );

                  houses.forEach((p, index) => {
                      const { lat, lng } = getSafeCoords(p);
                      bounds.push([lat, lng]);

                      const markerText = p.house_number ? `เลขที่ ${p.house_number}` : `หลังที่ ${index + 1}`;
                      const customIcon = markerIcon(markerText, true);

                      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(layerGroup);
                      const popupContent = document.createElement('div');
                      popupContent.className = 'w-64 py-2';
                      popupContent.appendChild(createPopupItem(p));
                      marker.bindPopup(popupContent);
                  });
              } 
              else if (expandedZone.current) {
                  const projectClusters = zones.find(zone => zone.key === expandedZone.current)?.projects || [];
                  projectClusters.forEach(cluster => {
                      const count = cluster.items.length;
                      bounds.push([cluster.lat, cluster.lng]);
                      const markerText = count > 1 ? `${cluster.name} (${count} หลัง)` : cluster.name;
                      
                      const customIcon = markerIcon(markerText);

                      const marker = L.marker([cluster.lat, cluster.lng], { icon: customIcon, title: markerText, alt: markerText, zIndexOffset: count * 10 }).addTo(layerGroup);
                      marker.on('click', () => {
                          if (count > 1 && cluster.name !== 'ไม่ระบุชื่อโครงการ') {
                              expandedProject.current = cluster.name;
                              drawMap();
                          } else {
                              const popupContent = document.createElement('div');
                              popupContent.className = 'w-64 max-h-64 overflow-y-auto pr-2 py-2';
                              const title = document.createElement('h4');
                              title.className = 'font-bold text-brand-green mb-3 border-b pb-2 sticky top-0 bg-white z-10';
                              title.innerText = cluster.name;
                              popupContent.appendChild(title);
                              cluster.items.forEach(p => popupContent.appendChild(createPopupItem(p)));
                              marker.bindPopup(popupContent);
                              marker.openPopup();
                          }
                      });
                  });
              } 
              else {
                  zones.forEach(cluster => {
                      const uniqueProjects = cluster.projects.length;
                      bounds.push([cluster.lat, cluster.lng]);
                      const markerText = `${uniqueProjects} โครงการ`;
                      
                      const customIcon = markerIcon(markerText);

                      const label = `${cluster.name} · ${markerText} · ${cluster.items.length} หลัง`;
                      const marker = L.marker([cluster.lat, cluster.lng], { icon: customIcon, title: label, alt: label, zIndexOffset: cluster.items.length * 10 }).addTo(layerGroup);
                      const tooltip = document.createElement('span');
                      tooltip.textContent = label;
                      marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -6] });
                      marker.on('click', () => {
                          expandedZone.current = cluster.key;
                          drawMap();
                      });
                  });
              }

              if (bounds.length > 0) {
                  map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
              } else if (!expandedZone.current && !expandedProject.current) {
                  map.setView([13.980, 100.615], 11);
              }
          };

          drawMap();
      };
      
      initMap();
      return () => { cancelled = true; };
  }, [properties, onSelectProp, variant]);

  /* ในฉากภาพยนตร์ ความสูงต้องยืดหยุ่นตามจอ เพราะต้องแชร์พื้นที่กับหัวเรื่องด้านบน */
  if (variant === 'story') {
      return (
          <div className="cine-map-card">
              <div ref={mapRef} className="cine-map-canvas"></div>
          </div>
      );
  }

  return (
      <div className="w-full relative border border-gray-200 rounded-[20px] overflow-hidden shadow-sm bg-gray-50 z-0">
          <div ref={mapRef} className="w-full h-[350px] md:h-[450px] z-0"></div>
      </div>
  );
}

// --- HomeSection Component ---
function HomeSection({ properties, loading, onSelectProp, setActiveTab, onSelectLocation, onSearchCategory, onSearch, visualContent, updateVisualContent, isEditMode, onUpdateLocationImage, onRemoveLocationImage, showLocationMarquee = true, showMap = true, showSearch = true, showCategorySections = true }) {
  const [query, setQuery] = useState('');
  const handleSearchSubmit = (e) => { e.preventDefault(); onSearch(query.trim()); };

  const scrollContainerRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  const availableProps = properties;
  const locData = normalizeLocations(visualContent?.locations);
  const locationCards = visibleLocations(locData).map(loc => {
      const count = availableProps.filter(p => matchesMainArea(p, loc.area)).length;
      return { ...loc, count };
  });
  const marqueeItems = isEditMode ? locationCards : [...locationCards, ...locationCards];

  useEffect(() => {
      if (isEditMode || isPaused) return;
      const container = scrollContainerRef.current;
      if (!container) return;

      let animationId;
      let currentScroll = container.scrollLeft;
      const scrollSpeed = 0.5;

      const scroll = () => {
          if (Math.abs(currentScroll - container.scrollLeft) > 2) {
              currentScroll = container.scrollLeft;
          }
          
          currentScroll += scrollSpeed;
          container.scrollLeft = currentScroll;

          if (container.scrollLeft >= container.scrollWidth / 2 && marqueeItems.length > locationCards.length) {
              container.scrollLeft = 0;
              currentScroll = 0;
          }
          animationId = requestAnimationFrame(scroll);
      };
      animationId = requestAnimationFrame(scroll);

      return () => cancelAnimationFrame(animationId);
  }, [isPaused, isEditMode, marqueeItems.length, locationCards.length]);

  const handleManualScroll = (direction) => {
      if (scrollContainerRef.current) {
          const itemWidth = window.innerWidth < 768 ? 240 + 16 : 360 + 32;
          scrollContainerRef.current.scrollBy({ left: direction * itemWidth, behavior: 'smooth' });
      }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader className="animate-spin text-brand-green" size={48} /></div>;

  const padArray = (arr, length) => {
      const result = [...arr];
      while (result.length < length) result.push(null); 
      return result.slice(0, length);
  };

  const townhouses = padArray(availableProps.filter(p => p.category?.includes('ทาวน์เฮาส์')), 3);
  const twinHouses = padArray(availableProps.filter(p => p.category === 'บ้านแฝด'), 3);
  const singleHouses = padArray(availableProps.filter(p => p.category === 'บ้านเดี่ยว'), 3);

  const sections = [
      { key: 'secTownhouse', title: visualContent?.secTownhouse || DEFAULT_VISUAL_CONTENT.secTownhouse, data: townhouses, searchCat: 'ทาวน์เฮาส์' },
      { key: 'secTwinhouse', title: visualContent?.secTwinhouse || DEFAULT_VISUAL_CONTENT.secTwinhouse, data: twinHouses, searchCat: 'บ้านแฝด' },
      { key: 'secSinglehouse', title: visualContent?.secSinglehouse || DEFAULT_VISUAL_CONTENT.secSinglehouse, data: singleHouses, searchCat: 'บ้านเดี่ยว' },
  ];

  return (
    <main className="py-16 w-full max-w-full overflow-hidden min-h-screen">
        {/* v4 ยกช่องค้นหาขึ้นไปไว้ในฉากภาพยนตร์แล้ว จึงไม่ต้องมีซ้ำตรงนี้ */}
        {showSearch && (
        <div className="max-w-screen-xl mx-auto px-4 md:px-6">
            <div className="text-center mb-4 reveal-on-scroll">
                <EditableText tag="h2" fieldKey="homeTitle" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-3xl font-light text-brand-green mb-4 inline-block" />
            </div>
            
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full max-w-2xl mx-auto transform transition-transform hover:scale-[1.01] mb-12 reveal-on-scroll delay-100">
                <input 
                    type="text" 
                    placeholder={visualContent?.searchPlaceholder || DEFAULT_VISUAL_CONTENT.searchPlaceholder} 
                    className={`w-full pl-6 pr-14 py-4 rounded-full outline-none shadow-lg border border-gray-100 text-gray-700 font-light text-sm md:text-base focus:ring-4 focus:ring-brand-green/20 transition-all ${isEditMode ? 'pointer-events-none' : ''}`}
                    value={query} 
                    onChange={e => setQuery(e.target.value)} 
                />
                <button type="submit" disabled={isEditMode} className="absolute right-2 bg-brand-green text-white p-2.5 rounded-full hover:bg-[#135c2a] transition-colors disabled:opacity-50">
                    <Search size={20} />
                </button>
            </form>
        </div>
        )}

        {/* แถบทำเลเลื่อนอัตโนมัติ — ดีไซน์ใหม่ (v4) ยกไปไว้ในฉากภาพยนตร์แล้ว
            เลยปิดตรงนี้ไม่ให้ซ้ำสองที่ ส่วนหน้าเดิมที่ / ยังแสดงตามปกติ */}
        {showLocationMarquee && (
        <div className="w-full max-w-[100vw] overflow-hidden mb-16 relative py-4 group reveal-on-scroll delay-200">
            <button 
                onClick={() => handleManualScroll(-1)} 
                onMouseEnter={() => setIsPaused(true)} 
                onMouseLeave={() => setIsPaused(false)}
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-20 bg-white/90 text-brand-green p-3 rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all opacity-0 group-hover:opacity-100 hidden md:block"
            >
                <ChevronLeft size={24} />
            </button>

            <div 
                ref={scrollContainerRef}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
                className="flex overflow-x-auto py-2 px-4 scrollbar-hide gap-4 md:gap-8"
                style={{ scrollBehavior: isPaused || isEditMode ? 'smooth' : 'auto' }}
            >
                {marqueeItems.map((loc, idx) => (
                    <div key={idx} className="relative rounded-[20px] overflow-hidden w-[240px] md:w-[360px] h-[140px] md:h-[220px] flex-shrink-0 shadow-md hover:shadow-xl transition-all">
                        <a 
                            href={searchResultHref('main_location', loc.area)}
                            onClick={(e) => { 
                                if (!e.ctrlKey && !e.metaKey && !e.button) {
                                    e.preventDefault();
                                    if (onSelectLocation && !isEditMode) onSelectLocation('main_location', loc.area); 
                                }
                            }}
                            className={`block w-full h-full ${isEditMode ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                            <SmartImage src={getOptimizedImg(loc.img, 500)} alt={loc.area} width={500} height={320} sizes="(max-width: 768px) 240px, 360px" className="w-full h-full object-cover group-hover:scale-110 transition duration-700 pointer-events-none" loading="lazy" decoding="async" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 pointer-events-none"></div>
                            <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 flex justify-between items-end pointer-events-none">
                                <div className="text-white">
                                    <h4 className="font-medium text-xl md:text-2xl flex items-center gap-1 md:gap-2 mb-1 md:mb-2"><MapPin size={20} className="md:w-6 md:h-6" /> {loc.area}</h4>
                                    <p className="text-xs md:text-base font-light opacity-90">จำนวน {loc.count} โครงการ</p>
                                </div>
                                <div className="bg-white/20 backdrop-blur-md p-2 md:p-3 rounded-full text-white group-hover:bg-white group-hover:text-brand-green transition-colors shadow-lg">
                                    <ChevronRight size={20} className="md:w-6 md:h-6" />
                                </div>
                            </div>
                        </a>
                        
                        {isEditMode && (
                            <div className="absolute top-2 right-2 flex gap-2 z-50">
                                <label className="bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-lg" title="เปลี่ยนรูปภาพ">
                                    <Upload size={16} />
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { if(e.target.files[0]) onUpdateLocationImage(loc.srcIdx, e.target.files[0]) }} />
                                </label>
                                {loc.img !== DEFAULT_LOCATIONS_DATA.find(d => d.area === loc.area)?.img && (
                                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveLocationImage(loc.srcIdx); }} className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-lg" title="ลบรูปภาพกลับไปใช้รูปเริ่มต้น">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button 
                onClick={() => handleManualScroll(1)} 
                onMouseEnter={() => setIsPaused(true)} 
                onMouseLeave={() => setIsPaused(false)}
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-20 bg-white/90 text-brand-green p-3 rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all opacity-0 group-hover:opacity-100 hidden md:block"
            >
                <ChevronRight size={24} />
            </button>
        </div>
        )}
        
        {/* หน้า v4 ยกแผนที่ไปไว้ในฉากภาพยนตร์ตอนจบแล้ว จึงไม่ต้องมีซ้ำตรงนี้ */}
        {showMap && (
        <div className="max-w-6xl mx-auto px-4 md:px-6 w-full mb-20 overflow-hidden relative z-10 reveal-on-scroll">
            <div className="flex flex-col items-center justify-center text-center mb-8">
                <EditableText tag="h2" fieldKey="mapTitle" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-2xl font-bold text-brand-green mb-2 flex items-center gap-2 inline-flex" />
                <br/>
                <EditableText tag="p" fieldKey="mapSubtitle" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-gray-500 font-light text-sm inline-block" />
            </div>
            <PropertyMap properties={availableProps} onSelectProp={onSelectProp} />
        </div>
        )}

        {/* บ้านแยกหมวด (ทาวน์เฮาส์ / บ้านแฝด / บ้านเดี่ยว)
            v4 มีการ์ดหีบเพลง "บ้านเด่นที่เราคัดสรร" ในฉากเปิดทำหน้าที่นี้แล้ว จึงปิดตรงนี้ */}
        {showCategorySections && (
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 space-y-16">
            {sections.map((section, sIdx) => (
                <div key={section.key} className="w-full max-w-full overflow-hidden reveal-on-scroll">
                    <div className="flex justify-between items-center mb-6 px-2 md:px-0">
                        <div className="flex items-center gap-2">
                                <Home size={30} className="text-brand-green" />
                                <EditableText tag="h3" fieldKey={section.key} content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-2xl font-bold text-brand-green inline-block" />
                        </div>
                        <a href={searchResultHref('category', section.searchCat)} onClick={(e) => {
                            if (!e.ctrlKey && !e.metaKey && !e.button) { 
                                e.preventDefault(); 
                                if(!isEditMode && onSearchCategory) onSearchCategory('category', section.searchCat); 
                            } 
                        }} className={`bg-[#1b5e20] text-white px-4 md:px-5 py-1.5 md:py-2 rounded-full text-[13px] md:text-sm font-light hover:bg-opacity-90 transition flex items-center gap-1 ${isEditMode ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>
                            <EditableText tag="span" fieldKey="btnSeeAll" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="inline-block" />
                            <ChevronRight size={16} />
                        </a>
                    </div>
                    
                    <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 md:gap-6 pb-6 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                        {section.data.map((p, index) => {
                            if (!p) {
                                return (
                                    <div key={`empty-${index}`} className="bg-white border-2 border-dashed border-gray-200 rounded-2xl flex flex-col w-[300px] min-w-[300px] h-[400px] min-h-[400px] opacity-60 snap-center flex-shrink-0">
                                            <div className="h-[220px] w-full bg-gray-50 rounded-t-2xl flex items-center justify-center"><ImageIcon size={48} className="text-gray-300" /></div>
                                            <div className="p-5 flex flex-col flex-grow"><div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div><div className="h-4 bg-gray-100 rounded w-full mb-4"></div><div className="mt-auto pt-4 border-t border-gray-100"><div className="h-6 bg-gray-200 rounded w-1/3"></div></div></div>
                                    </div>
                                );
                            }
                            return (
                                <a href={getPropertySharePath(p)} key={p.id} onClick={(e) => { 
                                    if (!e.ctrlKey && !e.metaKey && !e.button) {
                                        e.preventDefault(); 
                                        if(!isEditMode) onSelectProp(p);
                                    }
                                }} className={`block bg-white border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden flex flex-col w-[300px] min-w-[300px] h-[400px] min-h-[400px] snap-center flex-shrink-0 ${isEditMode ? 'pointer-events-none cursor-default' : 'cursor-pointer'}`}>
                                    <div className="h-[220px] w-full relative overflow-hidden bg-gray-100 pointer-events-none flex-shrink-0">
                                        <SmartImage src={getOptimizedImg(p.images?.[0] || p.imageUrl || "https://placehold.co/600x400", 500)} alt={p.project_name} width={500} height={360} sizes="300px" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-gray-700 px-3 py-1.5 rounded-full font-medium text-xs shadow-sm z-10 flex items-center gap-1.5"><Home size={14} className="text-brand-green" />{p.category}</div>
                                        
                                        {/* แสดงป้าย Promotion/New ตามปกติ (ซ่อนป้าย Sold Out เล็กมุมขวา) */}
                                        {p.badge && p.badge !== 'Sold Out' && <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full font-medium text-xs shadow-sm z-10 text-white ${p.badge === 'Promotion' ? 'bg-red-600' : p.badge === 'New' ? 'bg-blue-600' : 'bg-brand-green'}`}>{p.badge}</div>}
                                        
                                        {p.badge === 'Sold Out' && <SoldOutRibbon />}
                                    </div>
                                    <div className="p-5 flex flex-col flex-grow pointer-events-none">
                                        <h4 className="font-bold text-gray-800 text-[18px] mb-2 line-clamp-2 leading-snug">{p.project_name}</h4>
                                        <div className="text-[13px] text-gray-500 flex items-center gap-1.5 mb-4"><MapPin size={15} className="flex-shrink-0 text-gray-400" /><span className="font-light truncate">{p.main_location || p.district} {p.sub_location || p.subdistrict ? `- ${p.sub_location || p.subdistrict}` : ''}</span></div>
                                        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                            <span className="text-[20px] font-bold text-brand-green"><span className="text-[16px] mr-1">฿</span>{Number(String(p.price || 0).replace(/,/g, '')).toLocaleString()}</span>
                                            <div className="flex items-center gap-3 text-gray-500 text-[13px]"><div className="flex items-center gap-1.5" title="พื้นที่"><Maximize size={15} /> {p.area_wah}</div><div className="flex items-center gap-1.5" title="ห้องนอน"><Bed size={15} /> {p.bedrooms}</div><div className="flex items-center gap-1.5" title="ห้องน้ำ"><Bath size={15} /> {p.bathrooms}</div></div>
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
        )}

        <div className="bg-gray-50 py-16 mt-8 mb-12 md:py-20 md:mt-12 md:mb-16 rounded-[30px] md:rounded-[40px] px-6 md:px-12 max-w-7xl mx-auto shadow-sm border border-gray-100 reveal-on-scroll">
            <div className="text-center mb-10 md:mb-12">
                <EditableText tag="h2" fieldKey="whyUsTitle" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-2xl md:text-3xl font-bold text-brand-green inline-block" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-md transition hover:-translate-y-1">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-light text-brand-green rounded-2xl flex items-center justify-center mb-5 md:mb-6"><Star size={24} className="md:w-7 md:h-7" /></div>
                    <EditableText tag="h3" fieldKey="whyUs1Title" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-lg md:text-xl font-bold text-gray-800 mb-2 md:mb-3 block" />
                    <EditableText tag="p" fieldKey="whyUs1Desc" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-sm md:text-base text-gray-500 font-light leading-relaxed block" />
                </div>
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-md transition hover:-translate-y-1">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-light text-brand-green rounded-2xl flex items-center justify-center mb-5 md:mb-6"><Home size={24} className="md:w-7 md:h-7" /></div>
                    <EditableText tag="h3" fieldKey="whyUs2Title" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-lg md:text-xl font-bold text-gray-800 mb-2 md:mb-3 block" />
                    <EditableText tag="p" fieldKey="whyUs2Desc" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-sm md:text-base text-gray-500 font-light leading-relaxed block" />
                </div>
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-md transition hover:-translate-y-1">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-light text-brand-green rounded-2xl flex items-center justify-center mb-5 md:mb-6"><Calculator size={24} className="md:w-7 md:h-7" /></div>
                    <EditableText tag="h3" fieldKey="whyUs3Title" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-lg md:text-xl font-bold text-gray-800 mb-2 md:mb-3 block" />
                    <EditableText tag="p" fieldKey="whyUs3Desc" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-sm md:text-base text-gray-500 font-light leading-relaxed block" />
                </div>
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-md transition hover:-translate-y-1">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-light text-brand-green rounded-2xl flex items-center justify-center mb-5 md:mb-6"><ClipboardCheck size={24} className="md:w-7 md:h-7" /></div>
                    <EditableText tag="h3" fieldKey="whyUs4Title" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-lg md:text-xl font-bold text-gray-800 mb-2 md:mb-3 block" />
                    <EditableText tag="p" fieldKey="whyUs4Desc" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-sm md:text-base text-gray-500 font-light leading-relaxed block" />
                </div>
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-md transition hover:-translate-y-1">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-light text-brand-green rounded-2xl flex items-center justify-center mb-5 md:mb-6"><FileText size={24} className="md:w-7 md:h-7" /></div>
                    <EditableText tag="h3" fieldKey="whyUs5Title" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-lg md:text-xl font-bold text-gray-800 mb-2 md:mb-3 block" />
                    <EditableText tag="p" fieldKey="whyUs5Desc" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-sm md:text-base text-gray-500 font-light leading-relaxed block" />
                </div>
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-md transition hover:-translate-y-1">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-light text-brand-green rounded-2xl flex items-center justify-center mb-5 md:mb-6"><ShieldCheck size={24} className="md:w-7 md:h-7" /></div>
                    <EditableText tag="h3" fieldKey="whyUs6Title" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-lg md:text-xl font-bold text-gray-800 mb-2 md:mb-3 block" />
                    <EditableText tag="p" fieldKey="whyUs6Desc" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-sm md:text-base text-gray-500 font-light leading-relaxed block" />
                </div>
            </div>
        </div>

    </main>
  );
}

// --- LocationSection Component ---
function LocationSection({ onSelectLocation, visualContent, updateVisualContent, onUpdateLocationImage, isEditMode }) {
  const locData = visibleLocations(normalizeLocations(visualContent?.locations));

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 reveal-on-scroll">
      <div className="text-center mb-12">
          <EditableText tag="h2" fieldKey="locationTitle" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-3xl font-light text-brand-green inline-block" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
        {locData.map((loc, idx) => (
          <div key={idx} className="group animate-pop" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="block h-32 sm:h-48 md:h-64 rounded-2xl overflow-hidden relative mb-3 shadow-sm group-hover:shadow-md transition hover:-translate-y-1">
               <a href={searchResultHref('main_location', loc.area)} onClick={(e) => {
                   if (!e.ctrlKey && !e.metaKey && !e.button) {
                       e.preventDefault();
                       if (onSelectLocation && !isEditMode) onSelectLocation('main_location', loc.area);
                   }
               }} className={`block w-full h-full ${isEditMode ? 'pointer-events-none cursor-default' : 'cursor-pointer'}`}>
                   <SmartImage src={getOptimizedImg(loc.img, 500)} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt={loc.area} width={500} height={360} sizes="(max-width: 768px) 50vw, 25vw" loading="lazy" decoding="async" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4 md:p-6 transition group-hover:bg-black/30">
                      <h3 className="text-lg md:text-2xl font-medium tracking-wide text-white">{loc.area}</h3>
                   </div>
               </a>
               {isEditMode && (
                   <div className="absolute top-2 right-2 flex gap-2 z-50">
                       <label className="bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-lg" title="เปลี่ยนรูปภาพ">
                           <Upload size={16} />
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => { if(e.target.files[0]) onUpdateLocationImage(loc.srcIdx, e.target.files[0]) }} />
                       </label>
                   </div>
               )}
            </div>
            
            <div className="flex flex-wrap gap-1.5 px-1">
               {loc.sub_areas.map((sub, i) => (
                   <a href={searchResultHref('sub_location', sub, loc.area)} key={i} onClick={(e) => {
                       if (!e.ctrlKey && !e.metaKey && !e.button) {
                           e.preventDefault();
                           e.stopPropagation();
                           if (onSelectLocation && !isEditMode) onSelectLocation('sub_location', sub, loc.area);
                       }
                   }} className={`text-[10px] md:text-xs border border-gray-200 text-gray-500 px-2 md:px-3 py-1 md:py-1.5 rounded-full font-light transition ${isEditMode ? 'pointer-events-none' : 'hover:border-brand-green hover:text-brand-green hover:-translate-y-0.5'}`}>
                     {sub}
                   </a>
               ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- CalculatorSection Component ---
function CalculatorSection({ defaultPrice, minimalist = false, visualContent, updateVisualContent, isEditMode }) {
  const fieldId = useId();
  const [loanAmount, setLoanAmount] = useState('');
  const [interest, setInterest] = useState(3);
  const [age, setAge] = useState('');
  const [years, setYears] = useState(0);
  const [monthlyPayment, setMonthlyPayment] = useState(null);

  useEffect(() => { 
      if (defaultPrice) {
          setLoanAmount(Number(String(defaultPrice).replace(/,/g, '')).toLocaleString()); 
      }
  }, [defaultPrice]);
  
  useEffect(() => { setYears(age ? Math.max(0, Math.min(40, 70 - parseInt(age))) : 0); }, [age]);

  const handleLoanChange = (e) => {
      const rawValue = e.target.value.replace(/[^0-9]/g, '');
      setLoanAmount(rawValue ? Number(rawValue).toLocaleString() : '');
  };

  const handleSliderChange = (e) => {
      setLoanAmount(Number(e.target.value).toLocaleString());
  };
    
  const handleCalculate = () => {
    const rawLoan = Number(String(loanAmount).replace(/,/g, ''));
    if (years <= 0 || !rawLoan) { setMonthlyPayment(0); return; }
    const payment = monthlyMortgage(rawLoan, interest, years);
    setMonthlyPayment(isNaN(payment) ? 0 : payment.toFixed(0));
  };

  return (
    <div className={`${minimalist ? "" : "max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100"} reveal-on-scroll`}>
      {!minimalist && (
          <div className="text-center mb-8">
              <EditableText tag="h2" fieldKey="calcTitle" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-2xl font-light text-brand-green inline-block" />
          </div>
      )}
      <div className="space-y-5">
         <div className={minimalist ? "space-y-4" : "grid grid-cols-2 gap-6"}>
             <div>
                <label id={`${fieldId}-loan-label`} htmlFor={`${fieldId}-loan`} className="label flex justify-between items-center mb-2">
                    <span>วงเงินกู้ (บาท)</span>
                </label>
                <div className="flex flex-col gap-3">
                    <input id={`${fieldId}-loan`} name="loan_amount" type="text" inputMode="numeric" value={loanAmount} onChange={handleLoanChange} className={`input-modern font-medium text-brand-green ${isEditMode ? 'pointer-events-none opacity-60' : ''}`} disabled={isEditMode} />
                    <input id={`${fieldId}-loan-range`} name="loan_amount_range" aria-labelledby={`${fieldId}-loan-label`} type="range" min="100000" max="15000000" step="10000" value={Number(String(loanAmount).replace(/,/g, '')) || 0} onChange={handleSliderChange} className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0b3d1b] ${isEditMode ? 'pointer-events-none opacity-60' : ''}`} disabled={isEditMode} />
                </div>
             </div>
             <div className={minimalist ? "grid grid-cols-2 gap-4" : ""} >
                <div><label htmlFor={`${fieldId}-interest`} className="label">ดอกเบี้ย (%)</label><input id={`${fieldId}-interest`} name="interest_rate" type="text" inputMode="decimal" value={interest} onChange={e=>setInterest(e.target.value.replace(/[^0-9.]/g, ''))} className={`input-modern ${isEditMode ? 'pointer-events-none opacity-60' : ''}`} disabled={isEditMode} /></div>
                {!minimalist && <div></div>}
             </div>
         </div>
         
         <div className="grid grid-cols-2 gap-4">
             <div><label htmlFor={`${fieldId}-age`} className="label">อายุผู้กู้ (ปี)</label><input id={`${fieldId}-age`} name="borrower_age" type="text" inputMode="numeric" value={age} onChange={e=>setAge(e.target.value.replace(/[^0-9]/g, ''))} className={`input-modern ${isEditMode ? 'pointer-events-none opacity-60' : ''}`} disabled={isEditMode} /></div>
             <div><span className="label">ระยะเวลา (ปี)</span><div className="input-modern bg-gray-50 text-gray-500 border-transparent">{years > 0 ? `${years} ปี` : '-'}</div></div>
         </div>

         <button onClick={handleCalculate} className="w-full bg-brand-green text-white py-3.5 rounded-full font-light mt-4 hover:bg-opacity-90 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100" disabled={isEditMode}>คำนวณ</button>

         {monthlyPayment !== null && (
            <div className="mt-6 text-center p-6 bg-brand-light/30 rounded-2xl animate-pop">
               <p className="text-gray-500 text-sm font-light mb-1">ยอดผ่อนชำระต่อเดือนโดยประมาณ</p>
               <p className="text-3xl font-medium text-brand-green">{Number(monthlyPayment).toLocaleString()} <span className="text-lg">฿</span></p>
            </div>
         )}
      </div>
    </div>
  );
}

// --- SalePage Component (เวอร์ชันสมบูรณ์: สัดส่วนเป๊ะ/ไม่มีขอบ/บ้านเลขที่อยู่บน) ---
function SalePage({ property, companyInfo, onBack, properties, onSelectProp, visualContent, updateVisualContent, isEditMode, openLightbox }) {
  const [activeImg, setActiveImg] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const desktopScrollRef = useRef(null);
  const mobileScrollRef = useRef(null);
  
  const images = useMemo(() => (
      Array.isArray(property?.images) && property.images.length > 0
          ? property.images
          : [property?.imageUrl || "https://placehold.co/600x400"]
  ), [property]);
  const youtubeId = getYoutubeId(property?.youtubeUrl || '');

  useEffect(() => {
      setActiveImg(0);
      setIsVideoPlaying(false);
  }, [property?.id]);

  useEffect(() => {
      preloadImagesAround(images, activeImg, 1100, 1);
  }, [images, activeImg]);

  const safePropName = String(property?.project_name || '').trim();
  const safeSubDist = String(property?.subdistrict || '').trim();
  const safeSubLoc = String(property?.sub_location || '').trim();
  const safeDist = String(property?.district || '').trim();
  const safeMainLoc = String(property?.main_location || '').trim();

  const formatHouseAndSoi = () => {
      const hn = String(property?.house_number || '').trim();
      const soi = String(property?.soi || '').trim();
      if (!hn && !soi) return '';
      let out = hn ? `บ้านเลขที่ ${hn}` : '';
      if (soi) {
          const startsWithSoi = /^ซ(อย)?[.\s]|^Soi/i.test(soi);
          if (startsWithSoi) out += ` ${soi}`;
          else out += ` ซอย ${soi}`;
      }
      return out;
  };

  const relatedProps = properties
      .filter(p => p && p.id && p.id !== property?.id)
      .map(p => {
          let score = 0;
          const pName = String(p.project_name || '').trim();
          if (pName && safePropName && pName === safePropName) score += 1000;
          if ((String(p.subdistrict) === safeSubDist) || (String(p.sub_location) === safeSubLoc)) score += 100;
          if ((String(p.district) === safeDist) || (String(p.main_location) === safeMainLoc)) score += 50;
          if (p.category === property?.category) score += 10;
          const priceDiff = Math.abs((Number(String(p.price || 0).replace(/,/g, '')) || 0) - (Number(String(property?.price || 0).replace(/,/g, '')) || 0));
          return { ...p, relevanceScore: score, priceDiff };
      })
      .sort((a, b) => {
          if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
          return a.priceDiff - b.priceDiff;
      })
      .slice(0, 8);

  const handleScroll = (refToUse, direction) => {
      if (refToUse && refToUse.current) {
          const itemWidth = window.innerWidth < 768 ? 232 : 266;
          refToUse.current.scrollBy({ left: direction * itemWidth, behavior: 'smooth' });
      }
  };

  const selectActiveImage = (index) => {
      preloadImagesAround(images, index, 1100, 1);
      setActiveImg(index);
  };

  const renderRelatedProps = (refToUse) => {
      if (relatedProps.length === 0) return null;
      return (
          <div className="mt-12 mb-8 w-full relative reveal-on-scroll">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg md:text-xl font-medium text-brand-green border-l-4 border-brand-green pl-3">โครงการที่คุณอาจสนใจ</h3>
                  <div className="hidden md:flex gap-2">
                      <button onClick={() => handleScroll(refToUse, -1)} className="p-2 rounded-full bg-white shadow-sm border border-gray-100 hover:bg-gray-50 text-brand-green transition"><ChevronLeft size={20}/></button>
                      <button onClick={() => handleScroll(refToUse, 1)} className="p-2 rounded-full bg-white shadow-sm border border-gray-100 hover:bg-gray-50 text-brand-green transition"><ChevronRight size={20}/></button>
                  </div>
              </div>
              <div ref={refToUse} className="flex overflow-x-auto snap-x snap-mandatory gap-3 md:gap-4 pb-4 scrollbar-hide">
                  {relatedProps.map((p) => (
                      <a href={getPropertySharePath(p)} key={p.id} onClick={(e) => { if (!e.ctrlKey && !e.metaKey && !e.button) { e.preventDefault(); if(!isEditMode) onSelectProp(p); } }} 
                         className={`block bg-white border border-gray-200 hover:border-brand-green hover:shadow-md transition-all duration-200 rounded-lg overflow-hidden flex flex-col w-[220px] md:w-[250px] snap-center flex-shrink-0 ${isEditMode ? 'pointer-events-none cursor-default' : 'cursor-pointer'}`}>
                          <div className="h-[150px] md:h-[160px] w-full relative overflow-hidden bg-gray-100 pointer-events-none flex-shrink-0">
                              <SmartImage src={getOptimizedImg(p.images?.[0] || p.imageUrl, 400)} alt={p.project_name} width={400} height={260} sizes="(max-width: 768px) 220px, 250px" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                              <div className="absolute top-2 left-2 bg-white/95 px-2 py-1 rounded text-[10px] font-medium shadow-sm z-10">{p.category}</div>
                              {p.badge === 'Sold Out'
                                  ? <SoldOutRibbon size="sm" />
                                  : p.badge && <div className={`absolute top-2 right-2 px-2 py-1 rounded font-medium text-[10px] shadow-sm z-10 text-white ${p.badge === 'Promotion' ? 'bg-red-600' : p.badge === 'New' ? 'bg-blue-600' : 'bg-brand-green'}`}>{p.badge}</div>}
                          </div>
                          <div className="p-3 flex flex-col flex-grow pointer-events-none">
                              <h4 className="font-semibold text-brand-green text-[14px] md:text-[15px] mb-1 line-clamp-1">{p.project_name}</h4>
                              <div className="text-[11px] md:text-xs text-gray-500 flex items-center gap-1 mb-2"><MapPin size={12} className="flex-shrink-0 text-gray-400" /><span className="font-light truncate">{p.main_location || p.district}</span></div>
                              <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
                                  <span className="text-[16px] md:text-[18px] font-bold text-brand-green">฿{Number(String(p.price || 0).replace(/,/g, '')).toLocaleString()}</span>
                              </div>
                          </div>
                      </a>
                  ))}
              </div>
          </div>
      );
  };

  if (!property) return null;

  return (
    <div className="relative bg-gray-50 min-h-screen pb-12 animate-in fade-in duration-300 flex-grow w-full overflow-hidden">
      
      {/* Background Effect */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.05] transition-all duration-1000 ease-in-out" style={{ backgroundImage: `url(${getOptimizedImg(images[activeImg] || images[0], 800)})` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-50/80 via-gray-50/95 to-gray-50" />
      </div>

      <div className="relative z-10 max-w-[1100px] mx-auto px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8 lg:gap-12 w-full">
         
         <div className="lg:w-[60%] space-y-6 flex flex-col order-1 w-full reveal-on-scroll">
            
            <div>
                <button type="button" onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-brand-green transition-colors text-sm uppercase tracking-wide inline-flex mb-2 cursor-pointer hover:-translate-x-2 transition-transform">
                   <ChevronLeft size={16} /> ย้อนกลับ
                </button>
            </div>

            <div className="mb-2">
                <span className="bg-brand-green/10 text-brand-green px-3 py-1 rounded-full text-[11px] font-medium tracking-wide mb-3 inline-block">
                    {property.category}
                </span>
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 leading-tight">
                    {property.project_name}
                </h1>
                
                {(property.house_number || property.soi) && (
                    <div className="text-gray-700 text-sm md:text-base font-medium mt-1">
                        {formatHouseAndSoi()}
                    </div>
                )}

                {/* บรรทัดแสดงทำเล พร้อมปุ่มแชร์ขวาสุด */}
                <div className="flex items-center justify-between gap-4 text-gray-500 text-sm mt-2 font-light w-full">
                    <div className="flex items-center gap-1.5">
                        <MapPin size={16} className="text-brand-green flex-shrink-0" />
                        <span>{property.main_location || property.district} {property.sub_location || property.subdistrict ? `- ${property.sub_location || property.subdistrict}` : ''}</span>
                    </div>
                    
                    <button 
                        onClick={async (e) => {
                            e.preventDefault();
                            try {
                                await copyShortShareUrl(property);
                                alert('คัดลอกลิงก์เรียบร้อยแล้ว!');
                            } catch { alert('คัดลอกไม่สำเร็จ กรุณาลองอีกครั้ง'); }
                        }}
                        className="flex items-center gap-1.5 bg-brand-green text-white px-3 py-1.5 rounded-full text-[11px] font-medium hover:bg-opacity-90 transition-all shadow-sm flex-shrink-0"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    </button>
                </div>
            </div>

            <div 
                className="w-full overflow-hidden mb-4 relative group bg-white rounded-xl shadow-sm flex items-center justify-center border border-gray-200 cursor-pointer"
                onClick={() => openLightbox && openLightbox(images, activeImg)}
                title="คลิกเพื่อขยายรูปภาพ"
            >
                <SmartImage 
                    src={getOptimizedImg(images[activeImg] || images[0] || "https://placehold.co/600x400", 1100)} 
                    className="w-full h-auto object-contain transition duration-500 animate-pop" 
                    alt="Main" 
                    width={1100}
                    height={800}
                    sizes="(max-width: 1024px) 100vw, 660px"
                    priority
                    decoding="async"
                />
                
                {images.length > 1 && (
                    <>
                        <button onClick={(e) => { e.stopPropagation(); selectActiveImage(activeImg === 0 ? images.length - 1 : activeImg - 1); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 text-brand-green p-2 rounded-full hover:bg-white transition shadow-md opacity-0 group-hover:opacity-100 z-20"><ChevronLeft /></button>
                        <button onClick={(e) => { e.stopPropagation(); selectActiveImage(activeImg === images.length - 1 ? 0 : activeImg + 1); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 text-brand-green p-2 rounded-full hover:bg-white transition shadow-md opacity-0 group-hover:opacity-100 z-20"><ChevronRight /></button>
                    </>
                )}
                {property.badge === 'Sold Out'
                    ? <SoldOutRibbon size="lg" />
                    : property.badge && <div className={`absolute top-4 right-4 px-4 py-1.5 rounded-full font-medium text-xs shadow-lg z-20 text-white ${property.badge === 'Promotion' ? 'bg-red-600' : property.badge === 'New' ? 'bg-blue-600' : 'bg-brand-green'}`}>{property.badge}</div>}
                
                <div className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur z-20">
                    <Maximize size={16} />
                </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
                {images.map((img, idx) => (
                    <button key={idx} onClick={() => selectActiveImage(idx)} onMouseEnter={() => preloadImage(img, 1100)} onFocus={() => preloadImage(img, 1100)} className={`w-16 h-16 md:w-20 md:h-20 flex-shrink-0 overflow-hidden border-2 transition-all bg-gray-100 rounded-lg ${activeImg === idx ? 'border-brand-green opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                        <SmartImage src={getOptimizedImg(img || "https://placehold.co/100x100", 240)} className="w-full h-full object-cover" alt={`Thumb ${idx}`} width={120} height={120} sizes="80px" loading="lazy" decoding="async" />
                    </button>
                ))}
            </div>
            
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 reveal-on-scroll delay-100">
               <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                      <span className="block text-xs text-gray-400 font-light mb-1">ราคาขาย</span>
                      <span className="text-2xl md:text-3xl font-bold text-brand-green">฿ {Number(String(property.price || 0).replace(/,/g, '')).toLocaleString()}</span>
                  </div>
               </div>
               
               <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6 py-5 border-y border-gray-100">
                   <div className="text-center"><Maximize className="mx-auto text-gray-300 mb-1.5 stroke-1" size={24} /><span className="block font-medium text-base">{property.area_wah || '-'}</span><span className="text-[10px] text-gray-400 font-light">ตร.ว.</span></div>
                   <div className="text-center"><Bed className="mx-auto text-gray-300 mb-1.5 stroke-1" size={24} /><span className="block font-medium text-base">{property.bedrooms || '-'}</span><span className="text-[10px] text-gray-400 font-light">ห้องนอน</span></div>
                   <div className="text-center"><Bath className="mx-auto text-gray-300 mb-1.5 stroke-1" size={24} /><span className="block font-medium text-base">{property.bathrooms || '-'}</span><span className="text-[10px] text-gray-400 font-light">ห้องน้ำ</span></div>
                   <div className="text-center"><Car className="mx-auto text-gray-300 mb-1.5 stroke-1" size={24} /><span className="block font-medium text-base">{property.parking || '-'}</span><span className="text-[10px] text-gray-400 font-light">ที่จอดรถ</span></div>
                   <div className="text-center"><Compass className="mx-auto text-gray-300 mb-1.5 stroke-1" size={24} /><span className="block font-medium text-base">{property.direction || '-'}</span><span className="text-[10px] text-gray-400 font-light">ทิศ</span></div>
               </div>

               <h3 className="text-base font-medium text-brand-green mb-3">รายละเอียด</h3>
               <p className="text-gray-600 leading-relaxed font-light whitespace-pre-line mb-6 text-sm">{property.highlights || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>

               {Array.isArray(property.facilitiesList) && property.facilitiesList.length > 0 && (
                   <>
                   <h3 className="text-base font-medium text-brand-green mb-3">สิ่งอำนวยความสะดวก</h3>
                   <div className="flex flex-wrap gap-2 mb-6">
                       {property.facilitiesList.map((fac, i) => (
                         <span key={i} className="bg-gray-50 text-gray-600 px-3 py-1.5 rounded-full text-xs font-light border border-gray-100">{fac}</span>
                       ))}
                   </div>
                   </>
               )}

                {youtubeId && (
                    <div className="mb-6">
                        <h3 className="text-base font-medium text-brand-green mb-3">วิดีโอแนะนำ</h3>
                        <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-sm relative">
                            {!isVideoPlaying ? (
                                <div className="w-full h-full cursor-pointer group relative" onClick={() => setIsVideoPlaying(true)}>
                                    <SmartImage src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Video Preview" width={1280} height={720} sizes="(max-width: 1024px) 100vw, 660px" loading="lazy" decoding="async" onError={(e) => { e.target.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`; }} />
                                    <div className="absolute inset-0 flex items-center justify-center"><div className="w-14 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform"><svg className="w-6 h-6 text-white fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>
                                </div>
                            ) : (
                                <iframe width="100%" height="100%" src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin"></iframe>
                            )}
                        </div>
                    </div>
                )}

                {property.lat && property.lng && String(property.lat).trim() !== '' && String(property.lng).trim() !== '' && (
                    <div className="mb-6">
                        <h3 className="text-base font-medium text-brand-green mb-3">ที่ตั้งโครงการ</h3>
                        
                        {/* ลบ pointer-events-none ออก เพื่อให้ลูกค้าใช้นิ้วเลื่อนซูมแผนที่ได้ */}
                        <div className="aspect-video md:aspect-[21/9] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm relative">
                            <iframe 
                                title="Google Maps"
                                width="100%" 
                                height="100%" 
                                frameBorder="0" 
                                style={{ border: 0 }} 
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(`${property.lat},${property.lng}`)}&hl=th&z=16&output=embed`} 
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                        </div>
                        
                        {/* ปุ่มเปิดแอปนำทาง */}
                        <a 
                            href={isEditMode ? "#" : `https://www.google.com/maps/dir/?api=1&destination=${property.lat},${property.lng}`}
                            target={isEditMode ? "_self" : "_blank"}
                            rel="noopener noreferrer"
                            className={`mt-3 flex items-center justify-center gap-2 bg-white text-brand-green border border-brand-green hover:bg-brand-green hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors w-full shadow-sm ${isEditMode ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            <MapPin size={18} /> 
                            เปิดนำทางด้วย Google Maps
                        </a>
                    </div>
                )}
            </div>
            
            <div className="hidden lg:block order-2">
                {renderRelatedProps(desktopScrollRef)}
            </div>
         </div>

         <div className="lg:w-[40%] space-y-6 order-2 w-full reveal-on-scroll delay-200">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24 text-center">
                {companyInfo?.logoUrl && (<SmartImage src={getOptimizedImg(companyInfo.logoUrl, 240)} alt="Logo" width={240} height={96} sizes="240px" className="h-12 w-auto mx-auto mb-4 object-contain" loading="lazy" decoding="async" />)}
                <h3 className="font-medium text-base mb-5">สนใจติดต่อ</h3>
                <div className="space-y-3 mb-6">
                    <a href={isEditMode ? '#' : `tel:${companyInfo?.phone}`} data-phone-property-id={property.id} data-phone-property-name={[property.project_name, property.house_number].filter(Boolean).join(" ")} data-phone-property-slug={generatePropSlug(property)} className={`flex items-center justify-center gap-2 w-full bg-brand-green text-white py-3 rounded-full text-sm font-light hover:bg-opacity-90 transition hover:-translate-y-1 ${isEditMode ? 'pointer-events-none' : ''}`}><Phone size={16} /> {companyInfo?.phone}</a>
                    <a href={isEditMode ? '#' : lineContactHref(property)} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-center gap-2 w-full bg-[#06C755] text-white py-3 rounded-full text-sm font-light hover:bg-opacity-90 transition hover:-translate-y-1 ${isEditMode ? 'pointer-events-none' : ''}`}><MessageCircle size={16} /> ทักไลน์</a>
                </div>
                <div className="border-t border-gray-100 pt-5 text-left">
                    <CalculatorSection defaultPrice={property.price} minimalist={true} visualContent={visualContent} updateVisualContent={updateVisualContent} isEditMode={isEditMode} />
                </div>
            </div>
         </div>

         <div className="block lg:hidden order-3 w-full mt-6">
             {renderRelatedProps(mobileScrollRef)}
         </div>
      </div>
    </div>
  );
}

// --- PropertiesList Component ---
function PropertiesList({ properties, searchParams, onSelectProp, visualContent, updateVisualContent, isEditMode, locationLanding, pageHeading, listing, onListingChange, activeTab = 'all', basePath = '/' }) {
  const Heading = locationLanding || pageHeading ? 'h1' : 'h2';
  const CardHeading = locationLanding || pageHeading ? 'h2' : 'h4';
  const [fallbackListing, setFallbackListing] = useState(emptyListing);
  const state = listing || fallbackListing;
  const changeListing = patch => onListingChange ? onListingChange(patch) : setFallbackListing(previous => ({ ...previous, ...patch, page: patch.page || 1 }));
  const sortOption = state.sort || (locationLanding ? 'price_asc' : 'latest');
  const setSortOption = sort => changeListing({ sort });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  /* ตัวกรองแบบติ๊กหลายช่อง — เลือกทำเลและประเภทบ้านพร้อมกันได้
     เก็บเป็น array เพราะต้องใส่ใน dependency ของ useEffect ซึ่ง Set เทียบไม่ได้ */
  const pickedAreas = state.areas;
  const setPickedAreas = areas => changeListing({ areas });
  const pickedCats = state.categories;
  const setPickedCats = categories => changeListing({ categories });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const toggleIn = (list, setList, value) => {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };
  const areaOptions = visibleLocations(normalizeLocations(visualContent?.locations)).map((l) => l.area);
  const filterCount = pickedAreas.length + pickedCats.length;

  useEffect(() => {
      function handleClickOutside(event) {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
              setIsDropdownOpen(false);
          }
          if (filterRef.current && !filterRef.current.contains(event.target)) {
              setIsFilterOpen(false);
          }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const hasUnverifiedLocation = locationLanding && properties.some(p => matchesSeoLocation(p, locationLanding) && (!p.inventoryState || p.inventoryState === 'unknown'));
  const displayProps = selectListingProperties(properties, searchParams, state, locationLanding);
  const currentPage = state.page;
  const totalPages = Math.ceil(displayProps.length / LISTING_PAGE_SIZE);
  const currentProps = listingPage(displayProps, currentPage);
  const title = pageHeading || (locationLanding ? (locationLanding.heading || `บ้านมือสอง${locationLanding.name}`)
    : searchParams?.type === 'promo' ? (visualContent?.navPromo || DEFAULT_VISUAL_CONTENT.navPromo)
    : searchParams?.type === 'category' ? `หมวดหมู่: ${searchParams.value}`
    : searchParams?.type === 'keyword' ? `ผลการค้นหา: "${searchParams.value}"`
    : searchParams?.value ? `ทำเล: ${searchParams.area ? `${searchParams.area} - ` : ''}${searchParams.value}` : 'รายการทั้งหมด');
  const hrefForPage = page => listingHref({ activeTab, searchParams, location: locationLanding, listing: state, page, basePath });

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 pb-16 md:py-16 min-h-screen flex flex-col">
      {locationLanding?.kind && <nav aria-label="เส้นทางหน้าปัจจุบัน" className="mb-5 text-sm text-brand-green">
        <ol className="flex flex-wrap items-center gap-2">
          <li><a href="/" className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2">หน้าหลัก</a></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{locationLanding.name}</li>
        </ol>
      </nav>}
      {locationLanding && <p className="mb-4 text-brand-green">{locationLanding.intro}</p>}
      {hasUnverifiedLocation && <p role="status" className="mb-4 text-sm text-gray-600">บางรายการอยู่ระหว่างยืนยันสถานะ จึงยังไม่รวมในจำนวนบ้านที่เปิดรับจอง กรุณาสอบถามทีมงานหากไม่พบหลังที่สนใจ</p>}
      {!locationLanding && ['all', 'promo'].includes(activeTab) && areaHeadline(properties) && <p className="mb-1 text-sm font-medium text-[#98691d]">{areaHeadline(properties)}</p>}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-5 md:mb-10 gap-3 md:gap-4">
          <Heading className="text-2xl font-light text-brand-green">{title} <span className="text-sm text-gray-400 ml-2">{hasUnverifiedLocation && displayProps.length === 0 ? 'กำลังยืนยันรายการ' : `(${displayProps.length} รายการ)`}</span></Heading>
          
          <div className="flex items-center gap-2 flex-wrap">
          {/* ตัวกรอง : ติ๊กเลือกทำเลและประเภทบ้านพร้อมกันได้ */}
          <div className="relative" ref={filterRef}>
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 text-sm px-5 py-2.5 rounded-full border transition shadow-sm font-light ${filterCount > 0 ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-green hover:text-brand-green'}`}>
                  <SlidersHorizontal size={16} />
                  ตัวกรอง{filterCount > 0 ? <span className="font-medium">({filterCount})</span> : null}
                  <ChevronDown size={16} className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* ยึดขอบซ้ายของปุ่ม ไม่ใช่ขอบขวา เพราะปุ่มตัวกรองอยู่ซ้ายสุดของแถว
                  ถ้ายึดขวาแล้วแผงกว้าง 290px จะยื่นออกนอกจอทางซ้ายบนมือถือ
                  และคุมความกว้างไม่ให้เกินจอด้วย เผื่อเครื่องที่จอแคบกว่า 290px */}
              {isFilterOpen && (
                  <div className="absolute left-0 mt-2 w-[290px] max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.18)] border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-brand-green">ทำเล</span>
                          {filterCount > 0 && (
                              <button onClick={() => { changeListing({ areas: [], categories: [] }); }} className="text-xs text-gray-400 hover:text-brand-green transition">ล้างทั้งหมด</button>
                          )}
                      </div>
                      <div className="grid grid-cols-1 gap-1 mb-4">
                          {areaOptions.map((area) => (
                              <label key={area} className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-brand-light cursor-pointer transition">
                                  <input type="checkbox" className="accent-[#0b3d1b] w-4 h-4" checked={pickedAreas.includes(area)} onChange={() => toggleIn(pickedAreas, setPickedAreas, area)} />
                                  <span className={pickedAreas.includes(area) ? 'text-brand-green font-medium' : ''}>{area}</span>
                              </label>
                          ))}
                      </div>

                      <div className="text-sm font-medium text-brand-green mb-3 pt-3 border-t border-gray-100">ประเภทบ้าน</div>
                      <div className="grid grid-cols-1 gap-1">
                          {CATEGORIES.map((cat) => (
                              <label key={cat} className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-brand-light cursor-pointer transition">
                                  <input type="checkbox" className="accent-[#0b3d1b] w-4 h-4" checked={pickedCats.includes(cat)} onChange={() => toggleIn(pickedCats, setPickedCats, cat)} />
                                  <span className={pickedCats.includes(cat) ? 'text-brand-green font-medium' : ''}>{cat}</span>
                              </label>
                          ))}
                      </div>
                  </div>
              )}
          </div>

          {displayProps.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 px-5 py-2.5 rounded-full hover:border-brand-green hover:text-brand-green transition shadow-sm font-light">
                      เรียงตาม: <span className="font-medium text-brand-green">{sortOption === 'latest' ? 'อัปเดตล่าสุด' : sortOption === 'price_asc' ? 'ราคาต่ำสุด' : 'ราคาสูงสุด'}</span>
                      <ChevronDown size={16} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                          <button onClick={() => { setSortOption('latest'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm flex items-center justify-between hover:bg-brand-light transition">
                              <span className={sortOption === 'latest' ? 'text-brand-green font-medium' : 'text-gray-600'}>อัปเดตล่าสุด</span>
                              {sortOption === 'latest' && <Check size={16} className="text-brand-green" />}
                          </button>
                          <button onClick={() => { setSortOption('price_asc'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm flex items-center justify-between hover:bg-brand-light transition">
                              <span className={sortOption === 'price_asc' ? 'text-brand-green font-medium' : 'text-gray-600'}>ราคาต่ำสุด</span>
                              {sortOption === 'price_asc' && <Check size={16} className="text-brand-green" />}
                          </button>
                          <button onClick={() => { setSortOption('price_desc'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm flex items-center justify-between hover:bg-brand-light transition">
                              <span className={sortOption === 'price_desc' ? 'text-brand-green font-medium' : 'text-gray-600'}>ราคาสูงสุด</span>
                              {sortOption === 'price_desc' && <Check size={16} className="text-brand-green" />}
                          </button>
                      </div>
                  )}
              </div>
          )}
          </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 justify-items-center sm:justify-items-stretch flex-grow content-start">
        {currentProps.length > 0 ? currentProps.map((p, index) => (
           <HouseCard key={p.id} property={p} index={index} heading={CardHeading} onSelect={onSelectProp} isEditMode={isEditMode} />
        )) : <p className="text-gray-400 col-span-full text-center py-20 font-light w-full">ไม่พบรายการในหมวดหมู่นี้</p>}
      </div>
      {currentProps.length > 0 && <p className="mt-6 text-xs text-gray-400 text-center">{PAYMENT_NOTE}</p>}

      <ListingPagination page={currentPage} totalPages={totalPages} hrefForPage={hrefForPage} />
    </div>
  );
}

// --- PortfolioSection Component ---
function PortfolioSection({ soldHomes, companyInfo, properties, visualContent, updateVisualContent, isEditMode, openLightbox, listing, onListingChange, basePath = '/' }) {
  const soldOutProperties = properties.filter(p => p.badge === 'Sold Out');
  const portfolioYears = companyInfo?.portfolio_years || [];
  
  const [fallbackListing] = useState(emptyListing);
  const state = listing || fallbackListing;
  const activeAlbum = state.year;
  const currentPage = state.page;
  const IMAGES_PER_PAGE = LISTING_PAGE_SIZE;
  const hrefForPage = page => listingHref({ activeTab: 'portfolio', listing: state, page, basePath });

  if (activeAlbum) {
      const activeYearData = portfolioYears.find(y => String(y.year) === activeAlbum);
      if (!activeYearData) {
          return null; 
      }

      const totalImages = activeYearData.images || [];
      const totalPages = Math.ceil(totalImages.length / IMAGES_PER_PAGE);
      const startIndex = (currentPage - 1) * IMAGES_PER_PAGE;
      const currentImages = totalImages.slice(startIndex, startIndex + IMAGES_PER_PAGE);

      return (
        <div className="max-w-7xl mx-auto px-4 py-16 reveal-on-scroll">
            <a href={listingHref({ activeTab: 'portfolio', basePath })} className="flex items-center gap-2 text-gray-500 hover:text-brand-green transition-colors text-sm uppercase tracking-wide inline-flex mb-8 cursor-pointer hover:-translate-x-2 transition-transform">
                <ChevronLeft size={16} /> ย้อนกลับไปหน้าผลงาน
            </a>
            <div className="text-center mb-12">
                <h1 className="text-3xl font-light text-brand-green inline-block">ผลงานบ้านมือสองรีโนเวท ปี {activeAlbum}</h1>
            </div>
            
            {currentImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-start gap-4">
                    {currentImages.map((img, i) => (
                        <div 
                            key={i} 
                            onClick={() => openLightbox(totalImages, startIndex + i)} 
                            onMouseEnter={() => preloadImage(img, 1600)}
                            onFocus={() => preloadImage(img, 1600)}
                            className="rounded-xl overflow-hidden bg-gray-100 animate-pop shadow-sm hover:shadow-md cursor-pointer group relative" 
                            style={{ animationDelay: `${(i % IMAGES_PER_PAGE) * 30}ms` }}
                        >
                            <SmartImage src={getOptimizedImg(img, 600)} srcSet={`${getOptimizedImg(img, 400)} 400w, ${getOptimizedImg(img, 600)} 600w`} className="w-full h-auto group-hover:scale-105 transition duration-500" alt={`Portfolio image ${startIndex + i + 1}`} width={800} height={1000} sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 300px" loading={i < 4 ? 'eager' : 'lazy'} decoding="async"/>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <Maximize size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-400 py-20">ยังไม่มีรูปภาพในอัลบั้มนี้</p>
            )}

            <ListingPagination page={currentPage} totalPages={totalPages} hrefForPage={hrefForPage} />
        </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 reveal-on-scroll">
      <div className="text-center mb-16">
         <h1 className="text-3xl font-light text-brand-green inline-block">ผลงานบ้านมือสองรีโนเวท ปทุมธานีและพื้นที่ใกล้เคียง</h1>
      </div>
        
      {soldOutProperties.length === 0 && portfolioYears.length === 0 && (
         <div className="text-center py-20 text-gray-400 font-light">
             <EditableText tag="p" fieldKey="portfolioEmpty" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="inline-block" />
         </div>
      )}
        
      {portfolioYears.length > 0 && (
         <div className="mb-16">
            <h2 className="text-xl font-light text-gray-500 mb-6 uppercase tracking-widest border-b pb-2">อัลบั้มผลงาน</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
               {[...portfolioYears].sort((a,b) => Number(b.year) - Number(a.year)).map((yearGroup, idx) => {
                  const coverImg = (yearGroup.images && yearGroup.images.length > 0) ? yearGroup.images[0] : "https://placehold.co/400x400?text=No+Image";
                  const imageCount = yearGroup.images ? yearGroup.images.length : 0;
                  
                  return (
                      <a key={idx} href={listingHref({ activeTab: 'portfolio', listing: { year: String(yearGroup.year) }, basePath })} className="group cursor-pointer animate-pop" style={{ animationDelay: `${idx * 30}ms` }}>
                          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 relative shadow-sm group-hover:shadow-md transition-all duration-300">
                              <SmartImage src={getOptimizedImg(coverImg, 600)} srcSet={`${getOptimizedImg(coverImg, 320)} 320w, ${getOptimizedImg(coverImg, 600)} 600w`} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt={`Portfolio ${yearGroup.year}`} width={500} height={500} sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 300px" loading={idx < 4 ? 'eager' : 'lazy'} decoding="async" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
                              <div className="absolute bottom-4 left-4 right-4 text-white">
                                  <div className="flex items-center gap-2 mb-1">
                                      <FolderPlus size={18} className="text-brand-light" />
                                      <h3 className="text-lg md:text-xl font-medium">ผลงานปี {yearGroup.year}</h3>
                                  </div>
                                  <p className="text-sm font-light opacity-90">{imageCount} รูปภาพ</p>
                              </div>
                          </div>
                      </a>
                  );
               })}
            </div>
         </div>
      )}
      {soldHomes}
    </div>
  );
}

function NavButton({ active, onClick, href, isEditMode, children }) {
  return (
    <a href={isEditMode ? "#" : href} onClick={(e) => {
      if (isEditMode) { e.preventDefault(); return; }
      if (!e.ctrlKey && !e.metaKey && !e.button) { e.preventDefault(); onClick(); }
    }} className={`text-sm tracking-wide transition-colors duration-300 ${active ? 'text-brand-green font-medium' : 'text-gray-500 hover:text-brand-green'} ${isEditMode ? 'cursor-default' : ''}`}>
      {children}
    </a>
  );
}

function MobileNavBtn({ onClick, href, children }) {
  return <a href={href} onClick={(e) => {
      if (!e.ctrlKey && !e.metaKey && !e.button) { e.preventDefault(); onClick(); }
  }} className="block w-full text-left py-2 text-base font-light text-gray-600 hover:text-brand-green">{children}</a>;
}

function LoginModal({ onClose, onGoogleLogin }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleLogin = async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            await onGoogleLogin();
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 relative animate-pop">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                <h3 className="text-xl font-light text-brand-green mb-6 text-center">ระบบจัดการหลังบ้าน</h3>
                {message.text && <div className={`p-3 rounded-lg mb-6 text-sm font-light ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-brand-light text-brand-green'}`}>{message.text}</div>}
                
                <button 
                    onClick={handleLogin} 
                    disabled={loading} 
                    className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-full font-medium hover:bg-gray-50 transition flex items-center justify-center gap-3 disabled:opacity-50 hover:-translate-y-1"
                >
                    {loading ? (
                        <Loader className="animate-spin" size={20} />
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 41.939 C -8.804 40.009 -11.514 38.889 -14.754 38.889 C -19.444 38.889 -23.494 41.589 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                                </g>
                            </svg>
                            เข้าสู่ระบบด้วย Google
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

function CustomAlertModal({ isOpen, type, title, message, onConfirm, onCancel, showCancel, confirmText = 'ตกลง' }) {
    if (!isOpen) return null;
    const Icon = type === 'warning' ? AlertTriangle : type === 'error' ? XCircle : type === 'success' ? CheckCircle : AlertCircle;
    const iconColor = type === 'warning' ? 'text-yellow-500' : type === 'error' ? 'text-red-500' : type === 'success' ? 'text-green-500' : 'text-blue-500';
    
    return (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-50 mb-4">
                    <Icon className={`h-8 w-8 ${iconColor}`} />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 mb-8">{message}</p>
                <div className="flex gap-3 justify-center">
                    {showCancel && (
                        <button onClick={onCancel} className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full font-medium text-sm transition flex-1">ยกเลิก</button>
                    )}
                    <button onClick={onConfirm} className={`px-5 py-2.5 text-white rounded-full font-medium text-sm transition flex-1 ${type === 'error' ? 'bg-red-500 hover:bg-red-600' : type === 'warning' ? 'bg-brand-green hover:bg-[#135c2a]' : 'bg-brand-green hover:bg-[#135c2a]'}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   เปิดของข้างในให้ดีไซน์ใหม่ (pages/v4.js) หยิบไปใช้ซ้ำได้
   ทั้งหมดนี้เป็นตัวเดิมที่รันอยู่บนเว็บจริง ไม่ได้แก้พฤติกรรมอะไร
   ============================================================ */
export {
  // Firebase / ค่าคงที่ระบบ
  db, auth, appId, HOST_EMAIL, setDoc, updateDoc, addDoc, deleteDoc,
  // ข้อมูลตั้งต้น
  DEFAULT_COMPANY_INFO, DEFAULT_LOCATIONS_DATA, DEFAULT_VISUAL_CONTENT,
  CATEGORIES, BADGES, DIRECTIONS, COMMON_FACILITIES,
  DISTRICT_COORDS, AREA_SUB_COORDS, TRANSIT_LINES, HIDDEN_LOCATION_AREAS,
  // ตัวช่วย
  getAreaSubCoords, matchesMainArea, matchesSubArea, normalizeLocations,
  visibleLocations, searchResultHref, uploadFileToCloudinary, getOptimizedImg,
  preloadImage, preloadImagesAround, validateImage, getYoutubeId,
  normalizeThaiSearch, generatePropSlug, getPropertySharePath, getSafeCoords,
  // คอมโพเนนต์หน้าบ้าน
  SmartImage, SoldOutRibbon, Lightbox, EditableText, HeroSection,
  PropertyMap, HomeSection, LocationSection, CalculatorSection,
  SalePage, PropertiesList, PortfolioSection, NavButton, MobileNavBtn,
  // หลังบ้าน
  LoginModal, CustomAlertModal,
};
