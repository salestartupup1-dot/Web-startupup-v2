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

import React, { useState, useEffect, useRef, useMemo, useCallback, useId } from 'react';
import { Home, MapPin, Bed, Bath, Car, Maximize, Phone, MessageCircle, Menu, X, Plus, Trash2, ShieldCheck, CheckCircle, Calculator, Users, FileText, Settings, Edit, Save, Image as ImageIcon, Layout, ChevronLeft, ChevronRight, ChevronDown, Upload, Briefcase, XCircle, Tag, Loader, Video, Check, Copy, Calendar, FolderPlus, Map as MapIcon, Search, AlertTriangle, AlertCircle, Star, ClipboardCheck, Type, LayoutTemplate, Compass, SlidersHorizontal } from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, addDoc as sdkAddDoc, getDocsFromServer, doc, updateDoc as sdkUpdateDoc, deleteDoc as sdkDeleteDoc, onSnapshot, query, setDoc as sdkSetDoc, getDoc, getDocFromServer, serverTimestamp, writeBatch } from 'firebase/firestore';
import Head from 'next/head';
import Link from 'next/link';
import { lineContactHref } from '../../lib/lineAttribution';
import { fetchPublicCollectionRest, fetchPublicDocumentRest, makePropertySlug } from '../../lib/firestorePublic';
import { buildPageSeo, buildStructuredData, safeJsonLd } from '../../lib/seo';
import { PROPERTY_OWNERS, DEFAULT_PROPERTY_OWNER, getPropertyOwner, selectPublicProperties } from '../../lib/propertyOwners';
import { normalizeHouseKey, houseAliasKey } from '../../lib/masterStock';
import usePropertyLink from './usePropertyLink';
import usePublicPopup from './usePublicPopup';
import { subscribeSiteSession } from '../../lib/siteSession';
import { createPublicDataWrites } from '../../lib/publicDataWrites';
import { subscribePublicData } from '../../lib/publicDataSubscription';
import PublicDataNotice from './PublicDataNotice';
import { getPendingStockHouses, groupAdminStock } from '../../lib/adminStock';


const Facebook = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
);
const Instagram = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);
const Youtube = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.54 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.87 23 12 23 12s0-3.87-.54-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"></polygon></svg>
);

const firebaseConfig = {
  apiKey: "AIzaSyDsEeGxKA90-URCn06F-K3U2dvlISf_2Jo",
  authDomain: "startup-up-realestate.firebaseapp.com",
  projectId: "startup-up-realestate",
  storageBucket: "startup-up-realestate.firebasestorage.app",
  messagingSenderId: "750265634166",
  appId: "1:750265634166:web:a4f6cd0a59db8c685fbe57",
  measurementId: "G-1HZQ3RCXWP"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const HOST_EMAIL = 'startup.up.real.estate@gmail.com';
const appId = "startup-up-realestate";

const { setDoc, updateDoc, addDoc, deleteDoc } = createPublicDataWrites({
  db, appId, doc, writeBatch, serverTimestamp,
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
  logoUrl: 'https://res.cloudinary.com/dm2wr55r5/image/upload/v1773023427/LOGO_%E0%B9%80%E0%B8%82%E0%B8%B5%E0%B8%A2%E0%B8%A7%E0%B9%82%E0%B8%9B%E0%B8%A3%E0%B9%88%E0%B8%87_vhyhyo.png',
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
  const slug = generatePropSlug(property);
  return slug ? `/api/share?property=${slug}` : '/';
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
function EditableText({ tag: Tag = 'span', fieldKey, content, updateContent, isEditMode, className }) {
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
                      alt={`Hero ${currentIndex + 1}`} 
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
      lat = fallback[0] + (Math.random() - 0.5) * 0.005; 
      lng = fallback[1] + (Math.random() - 0.5) * 0.005;
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
 * ยังกดป้าย "N โครงการ" และปุ่มซูม +/- ได้ตามปกติ ซึ่งเป็นสิ่งที่คนใช้จริง
 * (ส่วนล้อเมาส์ปิดไว้อยู่แล้วทั้งสองโหมด จึงไม่เคยดักการเลื่อนบนคอม)
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
                  scrollWheelZoom: false,
                  // ในฉากภาพยนตร์บนจอสัมผัส ห้ามลากแผนที่ ไม่งั้นเลื่อนหน้าต่อไม่ได้
                  dragging: !(variant === 'story' && isTouch)
              });

              /**
               * แผนที่พื้นหลัง
               * แผนที่พื้นหลัง — Esri World Street Map
               *
               * ที่มา : เดิมใช้ CARTO Positron แต่ CARTO บังคับใช้ API key แล้ว ภาพเลยมีลายน้ำ
               * "API KEY REQUIRED" ทับ จึงย้ายมา Esri Light Gray ซึ่งไม่ต้องใช้คีย์
               * แต่ Light Gray จืดเกินไปจนดูไม่ออกว่าที่ไหนเป็นที่ไหน เลยเปลี่ยนมาใช้ World Street Map
               * ที่มีถนนแยกระดับสีส้ม/เหลือง ชื่อไทยครบ หน้าตาใกล้เคียง Google Maps ที่คนไทยคุ้น
               *
               * ข้อดีเทียบของเดิม : ชื่อสถานที่มาในไทล์เดียวกัน ไม่ต้องซ้อนชั้น label แยก (โหลดครึ่งเดียว)
               * และมีภาพจริงถึงระดับซูม 19 (Light Gray มีถึง 16 เท่านั้น ซูมใกล้แล้วภาพแตก)
               *
               * ยังไม่ต้องใช้ API key และ server.arcgisonline.com อยู่ใน CSP img-src แล้ว
               * ถ้าโหลดไม่ขึ้นจริง ๆ ค่อยถอยไปใช้ OpenStreetMap มาตรฐาน
               */
              const baseLayer = L.tileLayer(
                  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
                  { maxZoom: 19, attribution: '© OpenStreetMap contributors © Esri' }
              ).addTo(mapInstance.current);

              let tileErrors = 0;
              baseLayer.on('tileerror', () => {
                  tileErrors += 1;
                  // เผื่อเน็ตสะดุดชั่วคราว รอให้พลาดหลายไทล์ก่อนค่อยสลับ
                  if (tileErrors < 5 || !mapInstance.current) return;
                  baseLayer.off('tileerror');
                  mapInstance.current.removeLayer(baseLayer);
                  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                      attribution: '© OpenStreetMap contributors',
                      maxZoom: 19
                  }).addTo(mapInstance.current);
              });

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
                      (p.main_location || p.district || 'พื้นที่อื่นๆ') === expandedZone.current &&
                      ((p.project_name || '').trim() || 'ไม่ระบุชื่อโครงการ') === expandedProject.current
                  );

                  houses.forEach((p, index) => {
                      let { lat, lng } = getSafeCoords(p);
                      lat += (Math.random() - 0.5) * 0.0002; 
                      lng += (Math.random() - 0.5) * 0.0002;
                      bounds.push([lat, lng]);

                      const markerText = p.house_number ? `เลขที่ ${p.house_number}` : `หลังที่ ${index + 1}`;
                      const customIcon = L.divIcon({
                          className: '', 
                          html: `<div class="custom-map-marker shadow-lg border-2 hover:scale-105 transition max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap bg-brand-green text-white" style="border-color: white;">${markerText}</div>`,
                          iconSize: null, iconAnchor: [45, 15] 
                      });

                      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(layerGroup);
                      const popupContent = document.createElement('div');
                      popupContent.className = 'w-64 py-2';
                      popupContent.appendChild(createPopupItem(p));
                      marker.bindPopup(popupContent);
                  });
              } 
              else if (expandedZone.current) {
                  const zoneProps = validProps.filter(p => (p.main_location || p.district || 'พื้นที่อื่นๆ') === expandedZone.current);
                  const projectClusters = {};

                  zoneProps.forEach(p => {
                      const projName = (p.project_name || '').trim() || 'ไม่ระบุชื่อโครงการ';
                      if (!projectClusters[projName]) {
                          let { lat, lng } = getSafeCoords(p);
                          projectClusters[projName] = { lat, lng, name: projName, items: [] };
                      }
                      projectClusters[projName].items.push(p);
                  });

                  Object.values(projectClusters).forEach(cluster => {
                      const count = cluster.items.length;
                      bounds.push([cluster.lat, cluster.lng]);
                      const markerText = count > 1 ? `${cluster.name} (${count} หลัง)` : cluster.name;
                      
                      const customIcon = L.divIcon({
                          className: '', 
                          html: `<div class="custom-map-marker shadow-lg border-2 hover:scale-105 transition max-w-[250px] overflow-hidden text-ellipsis bg-white text-brand-green">${markerText}</div>`,
                          iconSize: null, iconAnchor: [45, 15] 
                      });

                      const marker = L.marker([cluster.lat, cluster.lng], { icon: customIcon }).addTo(layerGroup);
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
                          }
                      });
                  });
              } 
              else {
                  const zoneClusters = {};
                  validProps.forEach(p => {
                      const zoneName = p.main_location || p.district || 'พื้นที่อื่นๆ';
                      if (!zoneClusters[zoneName]) {
                          let { lat, lng } = getSafeCoords(p);
                          zoneClusters[zoneName] = { lat, lng, name: zoneName, items: [] };
                      }
                      zoneClusters[zoneName].items.push(p);
                  });

                  Object.values(zoneClusters).forEach(cluster => {
                      const uniqueProjects = new Set(cluster.items.map(p => (p.project_name || '').trim() || p.id)).size;
                      bounds.push([cluster.lat, cluster.lng]);
                      const markerText = `${uniqueProjects} โครงการ`;
                      
                      const customIcon = L.divIcon({
                          className: '', 
                          html: `<div class="custom-map-marker shadow-lg border-2 hover:scale-105 transition max-w-[250px] overflow-hidden text-ellipsis bg-[#eef3f0] text-brand-green font-bold px-4 py-2">${markerText}</div>`,
                          iconSize: null, iconAnchor: [45, 15] 
                      });

                      const marker = L.marker([cluster.lat, cluster.lng], { icon: customIcon }).addTo(layerGroup);
                      marker.on('click', () => {
                          expandedZone.current = cluster.name;
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
    const r = interest / 100 / 12; const n = years * 12;
    const payment = (rawLoan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
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
                        onClick={(e) => {
                            e.preventDefault();
                            const shareUrl = `https://www.startupup-real-estate.com${getPropertySharePath(property)}`;
                            navigator.clipboard.writeText(shareUrl);
                            alert('คัดลอกลิงก์สำหรับแชร์เรียบร้อยแล้ว!');
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
                    <a href={isEditMode ? '#' : `tel:${companyInfo?.phone}`} className={`flex items-center justify-center gap-2 w-full bg-brand-green text-white py-3 rounded-full text-sm font-light hover:bg-opacity-90 transition hover:-translate-y-1 ${isEditMode ? 'pointer-events-none' : ''}`}><Phone size={16} /> {companyInfo?.phone}</a>
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
function PropertiesList({ properties, searchParams, onSelectProp, visualContent, updateVisualContent, isEditMode }) {
  const [sortOption, setSortOption] = useState('latest');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  /* ตัวกรองแบบติ๊กหลายช่อง — เลือกทำเลและประเภทบ้านพร้อมกันได้
     เก็บเป็น array เพราะต้องใส่ใน dependency ของ useEffect ซึ่ง Set เทียบไม่ได้ */
  const [pickedAreas, setPickedAreas] = useState([]);
  const [pickedCats, setPickedCats] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const toggleIn = (list, setList, value) => {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };
  const areaOptions = visibleLocations(normalizeLocations(visualContent?.locations)).map((l) => l.area);
  const filterCount = pickedAreas.length + pickedCats.length;

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
      setCurrentPage(1);
  }, [searchParams, sortOption, pickedAreas, pickedCats]);

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

  let displayProps = [...properties];
  let title = 'รายการทั้งหมด';

  if (searchParams?.type === 'promo') {
      displayProps = properties.filter(p => p.badge === 'Promotion');
      title = visualContent?.navPromo || DEFAULT_VISUAL_CONTENT.navPromo;
  } else if (searchParams?.type === 'main_location' || searchParams?.type === 'district') {
      displayProps = properties.filter(p => matchesMainArea(p, searchParams.value));
      title = `ทำเล: ${searchParams.value}`;
  } else if (searchParams?.type === 'sub_location') {
      // ต้องกรองด้วยทำเลหลักที่กดมาด้วย ไม่งั้นคลองหนึ่งของคลองหลวงจะไปโผล่ในคลองหนึ่งของธัญบุรี
      const area = searchParams.area;
      displayProps = properties.filter(p => matchesSubArea(p, searchParams.value) && (!area || matchesMainArea(p, area)));
      title = `ทำเล: ${area ? `${area} - ` : ''}${searchParams.value}`;
  } else if (searchParams?.type === 'category') {
      if (searchParams.value === 'ทาวน์เฮาส์') {
          displayProps = properties.filter(p => p.category?.includes('ทาวน์เฮาส์'));
      } else {
          displayProps = properties.filter(p => p.category === searchParams.value);
      }
      title = `หมวดหมู่: ${searchParams.value}`;
  } else if (searchParams?.type === 'keyword') {
      const keyword = normalizeThaiSearch(searchParams.value); 
      displayProps = properties.filter(p => {
          const propString = normalizeThaiSearch(`${p.custom_id} ${p.main_location} ${p.sub_location} ${p.district} ${p.subdistrict} ${p.province} ${p.zipcode} ${p.project_name} ${p.house_number} ${p.soi} ${p.highlights} ${p.category} ${p.badge} ${p.price}`);
          return propString.includes(keyword);
      });
      title = `ผลการค้นหา: "${searchParams.value}"`;
  }

  /* ตัวกรองทับผลของหัวข้อหน้าอีกชั้น
     ติ๊กหลายอันในกลุ่มเดียวกันคือ "อย่างใดอย่างหนึ่ง" ข้ามกลุ่มคือ "ต้องเข้าทั้งสองกลุ่ม"
     ทาวน์เฮาส์ใช้ includes เพราะในสต๊อกมีทั้งหลังริมและชั้นเดียวที่ขึ้นต้นเหมือนกัน */
  if (pickedAreas.length > 0) {
      displayProps = displayProps.filter(p => pickedAreas.some(a => matchesMainArea(p, a)));
  }
  if (pickedCats.length > 0) {
      displayProps = displayProps.filter(p => pickedCats.some(c => (
          c === 'ทาวน์เฮาส์' ? p.category?.includes('ทาวน์เฮาส์') : p.category === c
      )));
  }

  let sortedProps = [...displayProps];
  if (sortOption === 'price_asc') {
      sortedProps.sort((a, b) => (Number(String(a.price).replace(/,/g,'')) || 0) - (Number(String(b.price).replace(/,/g,'')) || 0));
  } else if (sortOption === 'price_desc') {
      sortedProps.sort((a, b) => (Number(String(b.price).replace(/,/g,'')) || 0) - (Number(String(a.price).replace(/,/g,'')) || 0));
  }

  const totalPages = Math.ceil(sortedProps.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentProps = sortedProps.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
      setCurrentPage(page);
      window.scrollTo(0, 0); 
  };

  const renderPageNumbers = () => {
      const pages = [];
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, startPage + 4);

      if (endPage - startPage < 4) {
          startPage = Math.max(1, endPage - 4);
      }

      for (let i = startPage; i <= endPage; i++) {
          pages.push(
              <button
                  key={i}
                  onClick={() => handlePageChange(i)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition ${
                      currentPage === i
                          ? 'bg-brand-green text-white font-medium shadow-md'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-green hover:text-brand-green'
                  }`}
              >
                  {i}
              </button>
          );
      }
      return pages;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 min-h-screen flex flex-col reveal-on-scroll">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <h2 className="text-2xl font-light text-brand-green">{title} <span className="text-sm text-gray-400 ml-2">({displayProps.length} รายการ)</span></h2>
          
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
                              <button onClick={() => { setPickedAreas([]); setPickedCats([]); }} className="text-xs text-gray-400 hover:text-brand-green transition">ล้างทั้งหมด</button>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center flex-grow content-start">
        {currentProps.length > 0 ? currentProps.map((p, index) => (
           <a href={getPropertySharePath(p)} key={p.id} onClick={(e) => {
               if (!e.ctrlKey && !e.metaKey && !e.button) {
                   e.preventDefault(); 
                   if(!isEditMode) onSelectProp(p);
               }
           }} className={`block bg-white border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden flex flex-col w-[300px] min-w-[300px] h-[400px] min-h-[400px] ${isEditMode ? 'pointer-events-none cursor-default' : 'cursor-pointer'} animate-pop`} style={{ animationDelay: `${index * 50}ms` }}>
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
        )) : <p className="text-gray-400 col-span-full text-center py-20 font-light w-full">ไม่พบรายการในหมวดหมู่นี้</p>}
      </div>

      {totalPages > 1 && (
          <div className="flex justify-center items-center mt-16 gap-2 w-full">
              <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-600 hover:text-brand-green hover:border-brand-green disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                  <ChevronLeft size={20} />
              </button>

              <div className="flex gap-2 mx-2">
                  {renderPageNumbers()}
              </div>

              <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-600 hover:text-brand-green hover:border-brand-green disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                  <ChevronRight size={20} />
              </button>
          </div>
      )}
    </div>
  );
}

// --- PortfolioSection Component ---
function PortfolioSection({ companyInfo, properties, visualContent, updateVisualContent, isEditMode, openLightbox }) {
  const soldOutProperties = properties.filter(p => p.badge === 'Sold Out');
  const portfolioYears = companyInfo?.portfolio_years || [];
  
  const [activeAlbum, setActiveAlbum] = useState(null); 
  const [currentPage, setCurrentPage] = useState(1);
  const IMAGES_PER_PAGE = 20; 

  const handleOpenAlbum = (year) => {
      setActiveAlbum(year);
      setCurrentPage(1);
      window.scrollTo(0, 0);
  };

  const handleCloseAlbum = () => {
      setActiveAlbum(null);
      setCurrentPage(1);
      window.scrollTo(0, 0);
  };

  const handlePageChange = (page) => {
      setCurrentPage(page);
      window.scrollTo(0, 0);
  };

  if (activeAlbum) {
      const activeYearData = portfolioYears.find(y => y.year === activeAlbum);
      if (!activeYearData) {
          setActiveAlbum(null);
          return null; 
      }

      const totalImages = activeYearData.images || [];
      const totalPages = Math.ceil(totalImages.length / IMAGES_PER_PAGE);
      const startIndex = (currentPage - 1) * IMAGES_PER_PAGE;
      const currentImages = totalImages.slice(startIndex, startIndex + IMAGES_PER_PAGE);

      const renderPageNumbers = () => {
          const pages = [];
          let startPage = Math.max(1, currentPage - 2);
          let endPage = Math.min(totalPages, startPage + 4);
          if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

          for (let i = startPage; i <= endPage; i++) {
              pages.push(
                  <button key={i} onClick={() => handlePageChange(i)} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition ${currentPage === i ? 'bg-brand-green text-white font-medium shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-green hover:text-brand-green'}`}>
                      {i}
                  </button>
              );
          }
          return pages;
      };

      return (
        <div className="max-w-7xl mx-auto px-4 py-16 reveal-on-scroll">
            <button onClick={handleCloseAlbum} className="flex items-center gap-2 text-gray-500 hover:text-brand-green transition-colors text-sm uppercase tracking-wide inline-flex mb-8 cursor-pointer hover:-translate-x-2 transition-transform">
                <ChevronLeft size={16} /> ย้อนกลับไปหน้าผลงาน
            </button>
            <div className="text-center mb-12">
                <h2 className="text-3xl font-light text-brand-green inline-block">ผลงานปี {activeAlbum}</h2>
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
                            <SmartImage src={getOptimizedImg(img, 800)} className="w-full h-auto group-hover:scale-105 transition duration-500" alt={`Portfolio image ${startIndex + i + 1}`} width={800} height={1000} sizes="(max-width: 768px) 50vw, 25vw" loading="lazy" decoding="async"/>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <Maximize size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-400 py-20">ยังไม่มีรูปภาพในอัลบั้มนี้</p>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center items-center mt-16 gap-2 w-full">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-600 hover:text-brand-green hover:border-brand-green disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex gap-2 mx-2">
                        {renderPageNumbers()}
                    </div>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-600 hover:text-brand-green hover:border-brand-green disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm">
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 reveal-on-scroll">
      <div className="text-center mb-16">
         <EditableText tag="h2" fieldKey="portfolioTitle" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="text-3xl font-light text-brand-green inline-block" />
      </div>
        
      {soldOutProperties.length === 0 && portfolioYears.length === 0 && (
         <div className="text-center py-20 text-gray-400 font-light">
             <EditableText tag="p" fieldKey="portfolioEmpty" content={visualContent} updateContent={updateVisualContent} isEditMode={isEditMode} className="inline-block" />
         </div>
      )}
        
      {portfolioYears.length > 0 && (
         <div className="mb-16">
            <h3 className="text-xl font-light text-gray-500 mb-6 uppercase tracking-widest border-b pb-2">อัลบั้มผลงาน</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
               {[...portfolioYears].sort((a,b) => Number(b.year) - Number(a.year)).map((yearGroup, idx) => {
                  const coverImg = (yearGroup.images && yearGroup.images.length > 0) ? yearGroup.images[0] : "https://placehold.co/400x400?text=No+Image";
                  const imageCount = yearGroup.images ? yearGroup.images.length : 0;
                  
                  return (
                      <div key={idx} onClick={() => handleOpenAlbum(yearGroup.year)} className="group cursor-pointer animate-pop" style={{ animationDelay: `${idx * 30}ms` }}>
                          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 relative shadow-sm group-hover:shadow-md transition-all duration-300">
                              <SmartImage src={getOptimizedImg(coverImg, 500)} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt={`Portfolio ${yearGroup.year}`} width={500} height={500} sizes="(max-width: 768px) 50vw, 25vw" loading="lazy" decoding="async" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
                              <div className="absolute bottom-4 left-4 right-4 text-white">
                                  <div className="flex items-center gap-2 mb-1">
                                      <FolderPlus size={18} className="text-brand-light" />
                                      <h4 className="text-lg md:text-xl font-medium">ผลงานปี {yearGroup.year}</h4>
                                  </div>
                                  <p className="text-sm font-light opacity-90">{imageCount} รูปภาพ</p>
                              </div>
                          </div>
                      </div>
                  );
               })}
            </div>
         </div>
      )}
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

function CustomAlertModal({ isOpen, type, title, message, onConfirm, onCancel, showCancel }) {
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
                    <button onClick={onConfirm} className={`px-5 py-2.5 text-white rounded-full font-medium text-sm transition flex-1 ${type === 'error' ? 'bg-red-500 hover:bg-red-600' : type === 'warning' ? 'bg-brand-green hover:bg-[#135c2a]' : 'bg-brand-green hover:bg-[#135c2a]'}`}>ตกลง</button>
                </div>
            </div>
        </div>
    );
}

// --- FULL ADMIN PANEL ---
function AdminPanel({ userRole, userEmail, properties, users, companyInfo, popupData, locations, onClose, onLogout, db, appId, enterVisualEditMode, showAlert, showConfirm }) {
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
            const res = await fetch(`/api/stock-check${force ? '?refresh=1' : ''}`);
            if (!res.ok) throw new Error('เช็ค Master Stock ไม่สำเร็จ');
            const data = await res.json();
            if (!data?.houses) throw new Error('เช็ค Master Stock ไม่สำเร็จ');
            setStockIndex(data);
            setStockCheckError(data.stale ? 'ข้อมูล Master Stock อาจไม่ใช่ล่าสุด' : '');
        } catch {
            setStockCheckError('เช็ค Master Stock ไม่สำเร็จ');
        } finally {
            setIsStockRefreshing(false);
        }
    }, []);

    useEffect(() => { loadStockCheck(); }, [loadStockCheck]);

    const getStockAlert = (prop) => {
        if (!stockIndex?.houses) return null;
        if (!stockIndex.coversPartners && getPropertyOwner(prop) !== DEFAULT_PROPERTY_OWNER) return null;
        const key = normalizeHouseKey(prop?.house_number);
        if (!key) return null;

        // บางหลังในเว็บกรอกบ้านเลขที่ไม่ครบ (เว็บ "904" ชีต "11/904") ลองจับคู่ด้วยโครงการ+เลขท้าย
        const aliasKey = houseAliasKey(prop?.project_name, key);
        const hit = stockIndex.houses[key]
            || (aliasKey && stockIndex.aliases?.[aliasKey] ? stockIndex.houses[stockIndex.aliases[aliasKey]] : null);
        if (!hit) return { type: 'missing', label: 'ไม่มีใน Master Stock แล้ว', title: `ไม่พบบ้านเลขที่ ${prop.house_number} ใน Master Stock ของ All in One — ควรลบออกจากเว็บ` };
        if (hit.sold && prop?.badge !== 'Sold Out') return { type: 'sold', label: 'Master Stock ขึ้นว่าขายแล้ว', title: `${hit.source}: สถานะ "${hit.status}" — ควรลบออกจากเว็บ หรือติดป้าย Sold Out` };
        return null;
    };

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
        const url = `https://www.startupup-real-estate.com${getPropertySharePath(prop)}`;
        let copied = false;
        try {
            if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); copied = true; }
        } catch { copied = false; }
        if (!copied) {
            try {
                const ta = document.createElement('textarea');
                ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.focus(); ta.select();
                copied = document.execCommand('copy');
                document.body.removeChild(ta);
            } catch { copied = false; }
        }
        if (!copied) { showAlert('คัดลอกไม่สำเร็จ', url, 'warning'); return; }
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
        
        const allowedFiles = files.slice(0, 10 - imagesPreview.length);
        if (allowedFiles.length === 0) { showAlert('แจ้งเตือน', 'อัปโหลดได้สูงสุด 10 รูปครับ', 'warning'); return; }

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

    const safeLocations = locations || [];

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
                    <Link href="/admin/line-leads" prefetch={false} onClick={e => { e.preventDefault(); window.location.assign('/admin/line-leads'); }} className="px-6 py-3 text-left text-sm flex items-center gap-3 text-brand-green hover:bg-brand-light"><Tag size={18}/> ที่มาลูกค้า LINE</Link>
                    {userRole === 'host' && <button onClick={enterVisualEditMode} className={`px-6 py-3 text-left text-sm flex items-center gap-3 transition text-blue-600 hover:bg-blue-50 bg-blue-50/50`}><Layout size={18}/> ปรับแก้หน้าตาเว็บไซต์</button>}
                    <button onClick={() => { setPanelTab('properties'); setIsEditing(false); }} className={`px-6 py-3 text-left text-sm flex items-center gap-3 transition ${panelTab === 'properties' ? 'text-brand-green bg-brand-light font-medium border-r-2 border-brand-green' : 'text-gray-500 hover:bg-gray-50'}`}><Home size={18}/> จัดการบ้าน <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-600 ml-1">{properties.length}</span></button>
                    {userRole === 'host' && <button onClick={() => setPanelTab('company')} className={`px-6 py-3 text-left text-sm flex items-center gap-3 transition ${panelTab === 'company' ? 'text-brand-green bg-brand-light font-medium border-r-2 border-brand-green' : 'text-gray-500 hover:bg-gray-50'}`}><Briefcase size={18}/> ข้อมูลบริษัท</button>}
                    {userRole === 'host' && <button onClick={() => setPanelTab('portfolio_images')} className={`px-6 py-3 text-left text-sm flex items-center gap-3 transition ${panelTab === 'portfolio_images' ? 'text-brand-green bg-brand-light font-medium border-r-2 border-brand-green' : 'text-gray-500 hover:bg-gray-50'}`}><ImageIcon size={18}/> จัดการรูปผลงาน</button>}
                    {userRole === 'host' && <button onClick={() => setPanelTab('popup')} className={`px-6 py-3 text-left text-sm flex items-center gap-3 transition ${panelTab === 'popup' ? 'text-brand-green bg-brand-light font-medium border-r-2 border-brand-green' : 'text-gray-500 hover:bg-gray-50'}`}><LayoutTemplate size={18}/> จัดการป๊อปอัป</button>}
                    {userRole === 'host' && <button onClick={() => setPanelTab('users')} className={`px-6 py-3 text-left text-sm flex items-center gap-3 transition ${panelTab === 'users' ? 'text-brand-green bg-brand-light font-medium border-r-2 border-brand-green' : 'text-gray-500 hover:bg-gray-50'}`}><Users size={18}/> ผู้ดูแลระบบ</button>}
                </div>

                <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <div className="md:hidden flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
                        <Link href="/admin/line-leads" prefetch={false} onClick={e => { e.preventDefault(); window.location.assign('/admin/line-leads'); }} className="whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2 rounded-full bg-white text-brand-green border"><Tag size={14}/> ที่มาลูกค้า LINE</Link>
                        {userRole === 'host' && <button onClick={enterVisualEditMode} className={`whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2 rounded-full transition bg-blue-50 text-blue-600 border border-blue-200`}><Layout size={14}/> ปรับแก้หน้าเว็บ</button>}
                        <button onClick={() => { setPanelTab('properties'); setIsEditing(false); }} className={`whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2 rounded-full transition ${panelTab === 'properties' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 border'}`}><Home size={14}/> จัดการบ้าน</button>
                        {userRole === 'host' && <button onClick={() => setPanelTab('company')} className={`whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2 rounded-full transition ${panelTab === 'company' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 border'}`}><Briefcase size={14}/> ข้อมูลบริษัท</button>}
                        {userRole === 'host' && <button onClick={() => setPanelTab('portfolio_images')} className={`whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2 rounded-full transition ${panelTab === 'portfolio_images' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 border'}`}><ImageIcon size={14}/> รูปผลงาน</button>}
                        {userRole === 'host' && <button onClick={() => setPanelTab('popup')} className={`whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2 rounded-full transition ${panelTab === 'popup' ? 'bg-brand-green text-white' : 'bg-white text-gray-600 border'}`}><LayoutTemplate size={14}/> จัดการป๊อปอัป</button>}
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
                                                ของ All in One ({stockIndex.houseCount} หลัง) แล้ว — หลังที่มีป้าย <AlertTriangle size={11} className="text-red-500"/> คือไม่อยู่ในสต๊อกแล้ว ควรลบออกจากเว็บ
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
                                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle size={12}/> อ่านชีตได้ไม่ครบ — ข้ามการเช็คบ้าน Partner ไว้ก่อน</p>
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
                                            <div className="sm:col-span-2"><label className="label">ลิงก์ YouTube (Optional)</label><input className="input-modern" placeholder="https://youtube.com/..." value={formData.youtubeUrl} onChange={e=>setFormData({...formData, youtubeUrl: e.target.value})}/></div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h4 className="font-medium mb-6 pb-2 border-b">ทำเลแสดงผลบนหน้าเว็บ (ตามหมวดหมู่)</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">ทำเล (หลัก)</label>
                                                <select className="input-modern" value={formData.main_location} onChange={e => setFormData({...formData, main_location: e.target.value, sub_location: ''})}>
                                                    <option value="">- เลือกทำเลหลัก -</option>
                                                    {safeLocations.map(loc => <option key={loc.area} value={loc.area}>{loc.area}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label">ทำเลย่อย</label>
                                                <select className="input-modern" value={formData.sub_location} onChange={e => setFormData({...formData, sub_location: e.target.value})} disabled={!formData.main_location}>
                                                    <option value="">- เลือกทำเลย่อย -</option>
                                                    {formData.main_location && safeLocations.find(l => l.area === formData.main_location)?.sub_areas?.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                                </select>
                                            </div>
                                        </div>
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
                                        <h4 className="font-medium mb-6 pb-2 border-b">รูปภาพ</h4>
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
                                            
                                            {imagesPreview.length < 10 && (
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
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 relative group flex-shrink-0">
                                        {isUploadingLogo ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-200"><Loader className="animate-spin text-brand-green" size={24} /></div>
                                        ) : (
                                            <>
                                                <SmartImage src={getOptimizedImg(companyForm.logoUrl, 300)} className="w-full h-full object-cover" alt="Company logo" width={300} height={300} sizes="96px" loading="lazy" decoding="async" />
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
                                                <td className="p-4">{u.email}</td>
                                                <td className="p-4">
                                                    {u.role === 'pending' || !u.role ? (
                                                        <div className="flex gap-2 items-center"><span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs">รออนุมัติ</span><button onClick={()=>handleApproveUser(u.id, 'admin', u.email)} className="text-brand-green hover:underline">อนุมัติ Admin</button></div>
                                                    ) : (
                                                        <select value={u.role} onChange={e=>handleUpdateRole(u.id, e.target.value)} disabled={u.email===HOST_EMAIL} className={`p-1.5 border rounded outline-none text-xs ${u.role==='admin'?'bg-blue-50 text-blue-700 border-blue-200':'bg-brand-light text-brand-green border-brand-green/20'}`}><option value="admin">Admin</option><option value="host">Host</option><option value="pending">ระงับสิทธิ์</option></select>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">{u.email !== HOST_EMAIL && <button onClick={()=>handleRemoveUser(u.id)} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded transition">ลบ</button>}</td>
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

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); 
  const [userEmail, setUserEmail] = useState('');
  const [properties, setProperties] = useState([]);
  // หน้าเว็บฝั่งลูกค้าใช้เฉพาะบ้านของ Startup Up — บ้าน Partner ยังอยู่ครบใน properties สำหรับหลังบ้านและลิงก์ตรง
  const publicProperties = useMemo(() => selectPublicProperties(properties), [properties]);
  const [companyInfo, setCompanyInfo] = useState(DEFAULT_COMPANY_INFO);
  const [authorizedUsers, setAuthorizedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publicDataError, setPublicDataError] = useState(false);
    
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); 
  const [isRouteReady, setIsRouteReady] = useState(false);
  const [searchParams, setSearchParams] = useState({ type: 'all', value: '', area: '' });
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [isVisualEditMode, setIsVisualEditMode] = useState(false);
  const [visualContent, setVisualContent] = useState(DEFAULT_VISUAL_CONTENT);
  const popupData = usePublicPopup(db, appId);
  const [showPopupModal, setShowPopupModal] = useState(false);
  const [isSnoozeChecked, setIsSnoozeChecked] = useState(false);
  const hasCheckedPopup = useRef('');

  const [lightbox, setLightbox] = useState({ isOpen: false, images: [], startIndex: 0 });
  const openLightbox = (images, startIndex = 0) => setLightbox({ isOpen: true, images, startIndex });
  const closeLightbox = () => setLightbox({ ...lightbox, isOpen: false });

  const [pastVisual, setPastVisual] = useState([]);
  const [futureVisual, setFutureVisual] = useState([]);
  const [isSavingVisual, setIsSavingVisual] = useState(false);

  const [globalAlert, setGlobalAlert] = useState({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null, showCancel: false });

  const showGlobalAlert = (title, message, type = 'info') => {
      setGlobalAlert({ isOpen: true, type, title, message, showCancel: false, onConfirm: () => setGlobalAlert(prev => ({...prev, isOpen: false})) });
  };

  const showGlobalConfirm = (title, message, onConfirmCallback) => {
      setGlobalAlert({
          isOpen: true, type: 'warning', title, message, showCancel: true,
          onCancel: () => setGlobalAlert(prev => ({...prev, isOpen: false})),
          onConfirm: () => {
              setGlobalAlert(prev => ({...prev, isOpen: false}));
              if(onConfirmCallback) onConfirmCallback();
          }
      });
  };

  const [requestedPropSlug, setRequestedPropSlug] = useState(null);
  const seoMeta = useMemo(() => buildPageSeo({
      selectedProperty,
      activeTab,
      searchParams,
      companyInfo,
  }), [selectedProperty, activeTab, searchParams, companyInfo]);
  const structuredData = useMemo(() => buildStructuredData({
      companyInfo,
      selectedProperty,
  }), [companyInfo, selectedProperty]);

  useEffect(() => {
      window.scrollTo(0, 0);
  }, [activeTab, selectedProperty?.id, searchParams]);

  useEffect(() => {
      const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
              if (entry.isIntersecting) {
                  entry.target.classList.add('is-revealed');
              }
          });
      }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
      
      const timer = setTimeout(() => {
          document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
      }, 100);

      return () => {
          clearTimeout(timer);
          observer.disconnect();
      };
  }, [activeTab, selectedProperty, loading, properties.length]);

  useEffect(() => {
      const syncFromUrl = () => {
          try {
              const params = new URLSearchParams(window.location.search);
              const tab = params.get('tab') || 'home';
              const propSlug = params.get('property');
              const sType = params.get('sType');
              const sValue = params.get('sValue');

              setActiveTab(tab);
              if (sType && sValue) setSearchParams({ type: sType, value: sValue, area: params.get('sArea') || '' });
              setRequestedPropSlug(propSlug);
              if (!propSlug) setSelectedProperty(null);
          } catch (e) { console.warn("Cannot read URL parameters in this environment."); }
          setIsRouteReady(true);
      };
      syncFromUrl();
      window.addEventListener('popstate', syncFromUrl);
      return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  usePropertyLink({
    db, appId, loading, requestedPropSlug, properties, selectedProperty,
    setRequestedPropSlug, setSelectedProperty, setActiveTab, setGlobalAlert,
  });

  useEffect(() => {
      const params = new URLSearchParams();
      let targetPath = '/';

      if (selectedProperty) {
          targetPath = '/api/share';
          params.set('property', generatePropSlug(selectedProperty));
      } else {
          if (activeTab !== 'home') params.set('tab', activeTab);
          if (activeTab === 'search_result' && searchParams.value) {
              params.set('sType', searchParams.type);
              params.set('sValue', searchParams.value);
              if (searchParams.area) params.set('sArea', searchParams.area);
          }
      }

      try {
          const currentParams = new URLSearchParams(window.location.search);
          currentParams.forEach((value, key) => {
              const shouldPreserve = key === '_gl' || key === 'tagassistant' || key.startsWith('gtm_');
              if (shouldPreserve && !params.has(key)) params.append(key, value);
          });
      } catch (e) {}
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      try {
          const currentUrl = window.location.pathname + window.location.search;
          const newUrl = targetPath + queryString;
          if (currentUrl !== newUrl && !requestedPropSlug) {
              window.history.pushState({}, '', newUrl);
          }
      } catch (e) {}
  }, [activeTab, selectedProperty, searchParams, requestedPropSlug]);

  useEffect(() => {
      document.title = seoMeta.title;
      let metaOgImage = document.querySelector('meta[property="og:image"]');
      if (metaOgImage) {
          metaOgImage.setAttribute('content', seoMeta.image);
      }
  }, [seoMeta.title, seoMeta.image]);

  useEffect(() => {
      const handleWheel = (e) => { if (document.activeElement && document.activeElement.type === 'number') document.activeElement.blur(); };
      window.addEventListener('wheel', handleWheel, { passive: false });
      return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const isHomeView = isRouteReady && activeTab === 'home' && !selectedProperty && !requestedPropSlug;
    if (!popupData.isActive || !popupData.imageUrl) {
      hasCheckedPopup.current = '';
      setShowPopupModal(false);
      return;
    }
    if (!isHomeView) {
      setShowPopupModal(false);
      return;
    }
    if (hasCheckedPopup.current !== popupData.imageUrl) {
      hasCheckedPopup.current = popupData.imageUrl;
      let hideUntil = 0;
      try { hideUntil = Number(localStorage.getItem('hidePopupUntil')) || 0; } catch {}
      setShowPopupModal(Date.now() > hideUntil);
    }
  }, [popupData, isRouteReady, activeTab, selectedProperty, requestedPropSlug]);

  const updateVisualContent = useCallback((newContent) => {
      setPastVisual([...pastVisual, visualContent]);
      setVisualContent(newContent);
      setFutureVisual([]);
  }, [pastVisual, visualContent]);
  const undoVisual = useCallback(() => {
      if (pastVisual.length === 0) return;
      const prev = pastVisual[pastVisual.length - 1];
      setFutureVisual([visualContent, ...futureVisual]);
      setVisualContent(prev);
      setPastVisual(pastVisual.slice(0, -1));
  }, [pastVisual, visualContent, futureVisual]);
  const redoVisual = useCallback(() => {
      if (futureVisual.length === 0) return;
      const next = futureVisual[0];
      setPastVisual([...pastVisual, visualContent]);
      setVisualContent(next);
      setFutureVisual(futureVisual.slice(1));
  }, [futureVisual, pastVisual, visualContent]);
  const saveVisualEdit = () => {
      if (userRole !== 'host') {
          showGlobalAlert('ปฏิเสธการเข้าถึง', 'เฉพาะ Host เท่านั้นที่สามารถบันทึกการแก้ไขหน้าเว็บได้', 'error');
          return;
      }
      showGlobalConfirm('ยืนยันการบันทึก', 'คุณต้องการบันทึกการแก้ไขหน้าตาเว็บไซต์ใช่หรือไม่?', async () => {
          setIsSavingVisual(true);
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_settings', 'visual'), visualContent, { merge: true });
              
              setIsVisualEditMode(false);
              setPastVisual([]); setFutureVisual([]);
              showGlobalAlert('สำเร็จ', 'บันทึกการแก้ไขเรียบร้อยแล้ว', 'success');
          } catch (e) {
              showGlobalAlert('ผิดพลาด', e.message, 'error');
          }
          setIsSavingVisual(false);
      });
  };
  const cancelVisualEdit = () => {
      showGlobalConfirm('ยกเลิกการแก้ไข', 'การแก้ไขที่ยังไม่ได้บันทึกจะสูญหาย ยืนยันยกเลิก?', () => {
          setIsVisualEditMode(false);
          if (pastVisual.length > 0) setVisualContent(pastVisual[0]); 
          setPastVisual([]); setFutureVisual([]);
      });
  };

  const handleLocationImageUpdate = async (idx, file) => {
      try {
          validateImage(file);
          const url = await uploadFileToCloudinary(file);
          const newLocations = [...(visualContent.locations || DEFAULT_LOCATIONS_DATA)];
          newLocations[idx] = { ...newLocations[idx], img: url };
          updateVisualContent({ ...visualContent, locations: newLocations });
      } catch (err) {
          showGlobalAlert('อัปโหลดผิดพลาด', err.message, 'error');
      }
  };

  const handleRemoveLocationImage = (idx) => {
      if (userRole !== 'host') return;
      const newLocations = [...(visualContent.locations || DEFAULT_LOCATIONS_DATA)];
      const target = newLocations[idx];
      if (!target) return;
      const defaultImg = DEFAULT_LOCATIONS_DATA.find(d => d.area === target.area)?.img;
      if (!defaultImg) return;
      newLocations[idx] = { ...target, img: defaultImg }; 
      updateVisualContent({ ...visualContent, locations: newLocations });
  };

  useEffect(() => {
      if (!isVisualEditMode) return;
      const handleKeyDown = (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoVisual(); }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redoVisual(); }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisualEditMode, undoVisual, redoVisual]);

  useEffect(() => subscribeSiteSession({
    auth, hostEmail: HOST_EMAIL,
    observeAuth: onAuthStateChanged,
    signInGuest: signInAnonymously,
    observeRole: (email, onRole, onError) => onSnapshot(
      doc(db, 'artifacts', appId, 'public', 'data', 'users', email),
      snapshot => onRole(snapshot.exists() ? snapshot.data().role : null),
      onError,
    ),
    onSession: (session) => {
      setUser(session.user);
      setUserRole(session.userRole);
      setUserEmail(session.userEmail);
    },
  }), []);

  useEffect(() => {
    if (!loading) return;
    const timeoutId = setTimeout(() => {
        console.warn('Initial Firebase load timed out. Showing the public page with available default content.');
        setLoading(false);
    }, 20000);
    return () => clearTimeout(timeoutId);
  }, [loading]);

  useEffect(() => {
    const qProps = query(collection(db, 'artifacts', appId, 'public', 'data', 'properties'));
    const companyRef = doc(db, 'artifacts', appId, 'public', 'data', 'company_info', 'main');
    const visualRef = doc(db, 'artifacts', appId, 'public', 'data', 'site_settings', 'visual');
    const canManageSite = Boolean(user) && (userRole === 'host' || userRole === 'admin');

    const sortProperties = (items = []) => {
      const props = [...items];
      return props.sort((a, b) => {
         if (a.badge === 'Sold Out' && b.badge !== 'Sold Out') return 1;
         if (a.badge !== 'Sold Out' && b.badge === 'Sold Out') return -1;
         return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });
    };

    const applyPropertiesData = (items = []) => {
      setProperties(sortProperties(items));
      setLoading(false);
    };

    const snapshotToProperties = (snapshot) => snapshot.docs.map(item => ({ id: item.id, ...item.data() }));

    const applyPropertiesSnapshot = (snapshot) => {
      applyPropertiesData(snapshotToProperties(snapshot));
    };

    const stripRestDocumentId = (data) => {
      const cleaned = { ...data };
      delete cleaned.id;
      return cleaned;
    };

    const applyCompanyData = (data) => {
      if (data) {
          const companyData = stripRestDocumentId(data);
          setCompanyInfo({ ...DEFAULT_COMPANY_INFO, ...companyData });
      }
    };

    const applyCompanySnapshot = (docSnap) => {
      if (docSnap.exists()) {
          applyCompanyData(docSnap.data());
      }
    };

    const mergeLocations = (existingLocations) => {
        // ตรวจสอบและเพิ่ม location ใหม่จาก DEFAULT_LOCATIONS_DATA
        const merged = Array.isArray(existingLocations)
            ? existingLocations.filter(loc => loc && loc.area).map(loc => ({ ...loc }))
            : [];
        DEFAULT_LOCATIONS_DATA.forEach(defaultLoc => {
            const exists = merged.find(loc => loc.area === defaultLoc.area);
            if (!exists) {
                merged.push(defaultLoc);
            } else {
                // อัปเดต sub_areas ถ้ามีการเปลี่ยนแปลง
                exists.sub_areas = defaultLoc.sub_areas;
            }
        });
        // ทำเลที่ไม่ได้อยู่ในค่าเริ่มต้นอาจไม่มี sub_areas ติดมา — เติมให้เป็นอาเรย์เสมอ
        return merged.map(loc => (Array.isArray(loc.sub_areas) ? loc : { ...loc, sub_areas: [] }));
    };

    const applyVisualData = (data) => {
        if (data) {
            const visualData = stripRestDocumentId(data);
            visualData.locations = mergeLocations(visualData.locations);
            setVisualContent({ ...DEFAULT_VISUAL_CONTENT, ...visualData });
        }
    };

    const applyVisualSnapshot = (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            data.locations = mergeLocations(data.locations);
            setVisualContent({ ...DEFAULT_VISUAL_CONTENT, ...data });
        }
    };

    const applyPublicData = ({ props, company, visual }) => {
      if (!company) setCompanyInfo(DEFAULT_COMPANY_INFO);
      if (!visual) setVisualContent(DEFAULT_VISUAL_CONTENT);
      applyPropertiesData(props || []);
      applyCompanyData(company);
      applyVisualData(visual);
    };

    const loadPublicDataFromSdk = async () => {
      const [propsSnap, companySnap, visualSnap] = await Promise.all([
        getDocsFromServer(qProps),
        getDocFromServer(companyRef),
        getDocFromServer(visualRef)
      ]);

      return {
        props: snapshotToProperties(propsSnap),
        company: companySnap.exists() ? companySnap.data() : null,
        visual: visualSnap.exists() ? visualSnap.data() : null,
      };
    };

    /**
     * ทางหลักของผู้เข้าชมทั่วไป — อ่านผ่าน /api/public-data ที่แคชไว้ฝั่ง server
     * เพื่อไม่ให้เบราว์เซอร์ทุกคนยิงอ่าน Firestore ทั้งคอลเลกชัน (กินโควตาอ่านรายวันจนหมด)
     */
    const loadPublicDataFromApi = async () => {
      const response = await fetch('/api/public-data', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Public data API failed (${response.status})`);

      const data = await response.json();
      if (!Array.isArray(data?.properties) || data.stale) {
        throw new Error('Public data API returned invalid or stale data');
      }

      return { props: data.properties, company: data.company, visual: data.visual };
    };

    const loadPublicDataFromRest = async () => {
      const [props, company, visual] = await Promise.all([
        fetchPublicCollectionRest('properties'),
        fetchPublicDocumentRest('company_info/main', { cache: 'no-store' }),
        fetchPublicDocumentRest('site_settings/visual', { cache: 'no-store' }),
      ]);

      return { props, company, visual };
    };

    const withTimeout = (promise, timeoutMs, label) => Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      })
    ]);

    if (!canManageSite) {
      const load = async () => {
        try {
          return await withTimeout(loadPublicDataFromApi(), 6000, 'Public data API load');
        } catch (error) {
          console.warn('Public API unavailable, checking the source.', error);
          try {
            return await withTimeout(loadPublicDataFromRest(), 10000, 'Public data REST load');
          } catch {
            return await withTimeout(loadPublicDataFromSdk(), 6000, 'Public data server load');
          }
        }
      };
      return subscribePublicData({
        observe: (options, onValue, onError) => onSnapshot(
          doc(db, 'artifacts', appId, 'public', 'data', 'site_settings', 'public_version'),
          options, onValue, onError),
        load,
        onData: data => { setPublicDataError(false); applyPublicData(data); },
        onError: error => {
          console.warn('Could not verify current public data.', error);
          setPublicDataError(true);
          setProperties([]);
          setLoading(false);
        },
      });
    }

    const unsubProps = onSnapshot(qProps, applyPropertiesSnapshot, (error) => {
      console.warn(error);
      setLoading(false);
    });

    const unsubCompany = onSnapshot(companyRef, applyCompanySnapshot, (error) => console.warn(error));
    const unsubVisual = onSnapshot(visualRef, applyVisualSnapshot, (error) => console.warn(error));

    let unsubUsers = () => {};
    const qUsers = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
    unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAuthorizedUsers(users);
      if (!users.some(u => u.email === HOST_EMAIL) && users.length === 0) {
         setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', 'host_init'), { email: HOST_EMAIL, role: 'host', name: 'Main Host', createdAt: serverTimestamp() }).catch(e=>console.warn(e));
      }
    }, (error) => console.warn(error));
    
    return () => { unsubProps(); unsubCompany(); unsubVisual(); unsubUsers(); };
  }, [user, userRole]);

  const handleLogout = async () => {
    await signOut(auth);
    setUserRole(null); setUserEmail(''); setIsVisualEditMode(false);
    setShowAdminPanel(false); setActiveTab('home');
    await signInAnonymously(auth);
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const userEmail = result.user.email.toLowerCase();

        if (userEmail === HOST_EMAIL.toLowerCase()) {
            setUserRole('host'); setUserEmail(userEmail);
            setShowLoginModal(false); setShowAdminPanel(true);
            try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userEmail), { email: userEmail, role: 'host', name: result.user.displayName || 'Main Host', createdAt: serverTimestamp() }, { merge: true }); } catch (e) {}
            return;
        }

        const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userEmail);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const finalRole = userData.role || 'pending';
            if (finalRole === 'admin' || finalRole === 'host') {
                setUserRole(finalRole); setUserEmail(userEmail);
                setShowLoginModal(false); setShowAdminPanel(true);
            } else {
                await signOut(auth); await signInAnonymously(auth);
                throw new Error('บัญชีของคุณอยู่ระหว่างรอ Host อนุมัติ');
            }
        } else {
            await setDoc(userDocRef, { email: userEmail, role: 'pending', name: result.user.displayName || '', createdAt: serverTimestamp() });
            await signOut(auth); await signInAnonymously(auth);
            throw new Error('ส่งคำขอเข้าใช้งานสำเร็จแล้ว กรุณารอ Host อนุมัติสิทธิ์');
        }
    } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') throw new Error(error.message || 'การเข้าสู่ระบบผิดพลาด');
    }
  };

  const handleFilterSelect = (type, value, area = '') => {
    setSearchParams({ type, value, area }); setActiveTab('search_result'); setSelectedProperty(null); window.scrollTo(0, 0);
  };
  const handleGlobalSearch = (query) => {
    setSearchParams({ type: 'keyword', value: query, area: '' }); setActiveTab('search_result'); setSelectedProperty(null); window.scrollTo(0, 0);
  };
  const handleSelectProperty = (p) => {
    setRequestedPropSlug(generatePropSlug(p)); window.scrollTo(0, 0);
  };

  const globalCss = `
    html, body {
        font-family: 'Prompt', sans-serif;
        background-color: #ffffff;
        overflow-x: hidden;
        width: 100%;
        position: relative;
    }
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    input[type="number"] {
        -moz-appearance: textfield;
    }
    .input-modern {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        background-color: white;
        transition: all 0.2s;
        outline: none;
        font-family: 'Prompt', sans-serif;
    }
    .input-modern:focus {
        border-color: #0b3d1b;
        box-shadow: 0 0 0 2px rgba(11, 61, 27, 0.1);
        background-color: #f8faf9;
    }
    .label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 400;
        color: #4a5568;
        font-size: 0.9rem;
    }
    .btn-primary {
        background-color: #0b3d1b;
        color: white;
        font-weight: 500;
        padding: 0.75rem 1.5rem;
        border-radius: 9999px;
        transition: all 0.3s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }
    .btn-primary:hover {
        background-color: transparent;
        color: #0b3d1b;
        box-shadow: 0 0 0 1px #0b3d1b;
        transform: translateY(-2px);
    }
    .house-card {
        overflow: hidden;
        position: relative;
        cursor: pointer;
        background: #000;
    }
    .house-img {
        transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .house-card:hover .house-img {
        filter: brightness(0.25) contrast(1.2) saturate(0.8);
        transform: scale(1.05);
    }
    .reveal-on-scroll {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.8s ease-out, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .reveal-on-scroll.is-revealed {
        opacity: 1;
        transform: translateY(0);
    }
    .delay-100 { transition-delay: 100ms; }
    .delay-200 { transition-delay: 200ms; }
    .delay-300 { transition-delay: 300ms; }
    @keyframes popIn {
        0% { opacity: 0; transform: scale(0.8); }
        70% { transform: scale(1.05); }
        100% { opacity: 1; transform: scale(1); }
    }
    .animate-pop {
        animation: popIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes scrollMarquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
    }
    .animate-marquee {
        display: flex;
        width: max-content;
        animation: scrollMarquee 40s linear infinite;
    }
    .animate-marquee:hover {
        animation-play-state: paused;
    }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .custom-map-marker {
        background-color: white;
        border: 2px solid #0b3d1b;
        color: #0b3d1b;
        font-family: 'Prompt', sans-serif;
        font-weight: 600;
        font-size: 13px;
        padding: 4px 12px;
        border-radius: 20px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s;
    }
    .custom-map-marker:hover {
        transform: scale(1.1);
        background-color: #0b3d1b;
        color: white;
    }
    .leaflet-container {
        z-index: 10;
        font-family: 'Prompt', sans-serif;
    }
    .leaflet-popup-content-wrapper { border-radius: 12px; }
    .leaflet-tooltip { border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  `;

  return (
    <>
      <style>{globalCss}</style>
      
      <Head>
        <title>{seoMeta.title}</title>
        <meta name="description" content={seoMeta.description} />
        <meta name="robots" content={seoMeta.robots} />
        <meta name="googlebot" content={seoMeta.robots} />
        <meta name="google-site-verification" content="yM2oXyforQdUzBPi710gJZOV8eMPIQQqlAYmuO7b73E" />
        <meta name="facebook-domain-verification" content="4p7fie704kzdg66pjcn4c3w8511r5s" />
        <link rel="canonical" href={seoMeta.canonicalUrl} />
        <link rel="alternate" hrefLang="th-TH" href={seoMeta.canonicalUrl} />

        <meta property="og:locale" content="th_TH" />
        <meta property="og:type" content={seoMeta.type} />
        <meta property="og:site_name" content={companyInfo?.name || 'STARTUP UP'} />
        <meta property="og:title" content={seoMeta.title} />
        <meta property="og:description" content={seoMeta.description} />
        <meta property="og:url" content={seoMeta.canonicalUrl} />
        <meta property="og:image" content={seoMeta.image} />
        <meta property="og:image:secure_url" content={seoMeta.image} />
        <meta property="og:image:alt" content={seoMeta.imageAlt} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoMeta.title} />
        <meta name="twitter:description" content={seoMeta.description} />
        <meta name="twitter:image" content={seoMeta.image} />

        <meta name="theme-color" content="#0b3d1b" />
        <link rel="icon" type="image/png" href="/icon-192.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
        />
      </Head>

      <div className={`text-gray-800 bg-white min-h-screen flex flex-col font-sans relative ${isVisualEditMode ? 'pb-24 border-4 border-blue-500' : ''}`}>
        
        {publicDataError && <PublicDataNotice />}
        {showPopupModal && activeTab === 'home' && !selectedProperty && !requestedPropSlug && (
            <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full relative overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                    <div className="w-full relative flex-1 flex bg-gray-100">
                          <SmartImage src={getOptimizedImg(popupData.imageUrl, 900)} className="w-full h-auto max-h-[80vh] object-contain block m-0 p-0" alt="Promotion Popup" width={900} height={900} sizes="(max-width: 640px) 100vw, 512px" priority decoding="async" />
                    </div>
                    <div className="p-4 bg-white border-t flex items-center justify-between flex-shrink-0">
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                            <input type="checkbox" className="w-4 h-4 text-brand-green rounded border-gray-300 focus:ring-brand-green" checked={isSnoozeChecked} onChange={e=>setIsSnoozeChecked(e.target.checked)} />
                            ไม่แสดงหน้านี้อีกใน 24 ชม.
                        </label>
                        <button onClick={() => {
                            if(isSnoozeChecked) localStorage.setItem('hidePopupUntil', Date.now() + 24*60*60*1000);
                            setShowPopupModal(false);
                        }} className="text-sm font-medium px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition text-gray-700">ปิดหน้าต่าง</button>
                    </div>
                </div>
            </div>
        )}

        <nav className="fixed w-full top-0 z-40 bg-white/90 backdrop-blur-md shadow-sm transition-all duration-300">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="flex justify-between items-center h-20">
              <div className="w-1/3 flex justify-start items-center">
                  <button type="button" onClick={(e) => { 
                      if (!e.ctrlKey && !e.metaKey && !e.button) { 
                          e.preventDefault(); 
                          if(isVisualEditMode) return;
                          setActiveTab('home'); 
                          setSelectedProperty(null); 
                          window.scrollTo(0,0); 
                      } 
                  }} className={`cursor-pointer inline-block ${isVisualEditMode ? 'pointer-events-none opacity-50' : ''}`}>
                      {companyInfo?.logoUrl ? (
                          <SmartImage src={getOptimizedImg(companyInfo.logoUrl, 200)} alt="Logo" width={200} height={80} sizes="200px" priority className="h-10 md:h-12 w-auto object-contain" decoding="async" onError={(e) => { e.target.onerror = null; e.target.src = 'https://res.cloudinary.com/dm2wr55r5/image/upload/v1773023427/LOGO_%E0%B9%80%E0%B8%82%E0%B8%B5%E0%B8%A2%E0%B8%A7%E0%B9%82%E0%B8%9B%E0%B8%A3%E0%B9%88%E0%B8%87_vhyhyo.png'; }} />
                      ) : (
                          <span className="text-xl md:text-2xl font-light tracking-[0.2em] text-brand-green uppercase whitespace-nowrap">Startup Up</span>
                      )}
                  </button>
              </div>

              <div className="hidden lg:flex items-center justify-center space-x-4 xl:space-x-6 w-1/3">
                <NavButton href="/?tab=home" active={activeTab === 'home' && !selectedProperty} isEditMode={isVisualEditMode} onClick={() => {setActiveTab('home'); setSelectedProperty(null); window.scrollTo(0,0);}}>
                    <EditableText tag="span" fieldKey="navHome" content={visualContent} updateContent={updateVisualContent} isEditMode={isVisualEditMode} />
                </NavButton>
                <NavButton href="/?tab=promo" active={activeTab === 'promo' && !selectedProperty} isEditMode={isVisualEditMode} onClick={() => {setActiveTab('promo'); setSelectedProperty(null); window.scrollTo(0,0);}}>
                    <EditableText tag="span" fieldKey="navPromo" content={visualContent} updateContent={updateVisualContent} isEditMode={isVisualEditMode} />
                </NavButton>
                <NavButton href="/?tab=location" active={activeTab === 'location' && !selectedProperty} isEditMode={isVisualEditMode} onClick={() => {setActiveTab('location'); setSelectedProperty(null); window.scrollTo(0,0);}}>
                    <EditableText tag="span" fieldKey="navLocation" content={visualContent} updateContent={updateVisualContent} isEditMode={isVisualEditMode} />
                </NavButton>
                <NavButton href="/?tab=calculator" active={activeTab === 'calculator' && !selectedProperty} isEditMode={isVisualEditMode} onClick={() => {setActiveTab('calculator'); setSelectedProperty(null); window.scrollTo(0,0);}}>
                    <EditableText tag="span" fieldKey="navCalc" content={visualContent} updateContent={updateVisualContent} isEditMode={isVisualEditMode} />
                </NavButton>
                <NavButton href="/?tab=portfolio" active={activeTab === 'portfolio' && !selectedProperty} isEditMode={isVisualEditMode} onClick={() => {setActiveTab('portfolio'); setSelectedProperty(null); window.scrollTo(0,0);}}>
                    <EditableText tag="span" fieldKey="navPortfolio" content={visualContent} updateContent={updateVisualContent} isEditMode={isVisualEditMode} />
                </NavButton>
              </div>

              <div className="flex items-center justify-end w-1/3 gap-4">
                <div className="hidden lg:block">
                  {userRole ? (
                     <button onClick={() => setShowAdminPanel(true)} disabled={isVisualEditMode} className="flex items-center gap-2 px-4 py-1.5 border border-brand-green text-brand-green rounded-full hover:bg-brand-green hover:text-white transition-all text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                      <Settings size={14} /> ระบบจัดการ
                    </button>
                  ) : (
                    <button onClick={() => setShowLoginModal(true)} className="text-sm font-medium text-gray-400 hover:text-brand-green transition-colors duration-300 whitespace-nowrap">Admin Login</button>
                  )}
                </div>
                <div className="lg:hidden flex items-center">
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-800 hover:text-brand-green focus:outline-none p-2 -mr-2">
                      {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {isMenuOpen && (
            <div className="lg:hidden bg-white border-t border-gray-100 py-4 absolute w-full shadow-lg">
              <div className="px-6 space-y-4 flex flex-col">
                <MobileNavBtn href="/?tab=home" onClick={() => {setActiveTab('home'); setSelectedProperty(null); setIsMenuOpen(false); window.scrollTo(0,0);}}>{visualContent?.navHome || DEFAULT_VISUAL_CONTENT.navHome}</MobileNavBtn>
                <MobileNavBtn href="/?tab=promo" onClick={() => {setActiveTab('promo'); setSelectedProperty(null); setIsMenuOpen(false); window.scrollTo(0,0);}}>{visualContent?.navPromo || DEFAULT_VISUAL_CONTENT.navPromo}</MobileNavBtn>
                <MobileNavBtn href="/?tab=location" onClick={() => {setActiveTab('location'); setSelectedProperty(null); setIsMenuOpen(false); window.scrollTo(0,0);}}>{visualContent?.navLocation || DEFAULT_VISUAL_CONTENT.navLocation}</MobileNavBtn>
                <MobileNavBtn href="/?tab=calculator" onClick={() => {setActiveTab('calculator'); setSelectedProperty(null); setIsMenuOpen(false); window.scrollTo(0,0);}}>{visualContent?.navCalc || DEFAULT_VISUAL_CONTENT.navCalc}</MobileNavBtn>
                <MobileNavBtn href="/?tab=portfolio" onClick={() => {setActiveTab('portfolio'); setSelectedProperty(null); setIsMenuOpen(false); window.scrollTo(0,0);}}>{visualContent?.navPortfolio || DEFAULT_VISUAL_CONTENT.navPortfolio}</MobileNavBtn>
                <div className="h-px bg-gray-100 my-2"></div>
                {userRole ? (
                  <button onClick={() => {setShowAdminPanel(true); setIsMenuOpen(false)}} className="w-full text-left py-2 text-brand-green font-medium">เข้าสู่ระบบหลังบ้าน</button>
                ) : (
                  <button onClick={() => {setShowLoginModal(true); setIsMenuOpen(false)}} className="w-full text-left py-2 text-gray-400 font-medium">Admin Login</button>
                )}
              </div>
            </div>
          )}
        </nav>

        <div className="flex-grow pt-20 flex flex-col w-full max-w-[100vw] overflow-x-hidden">
          {(loading || requestedPropSlug) ? (
              <div className="min-h-[80vh] flex flex-col items-center justify-center">
                  <Loader className="animate-spin text-brand-green mb-4" size={48} />
                  <p className="text-gray-400 font-light tracking-wider animate-pulse">กำลังเตรียมข้อมูล...</p>
              </div>
          ) : selectedProperty ? (
            <SalePage property={selectedProperty} companyInfo={companyInfo} onBack={() => {setSelectedProperty(null); window.scrollTo(0,0);}} properties={publicProperties} onSelectProp={handleSelectProperty} visualContent={visualContent} updateVisualContent={updateVisualContent} isEditMode={isVisualEditMode} openLightbox={openLightbox} />
          ) : (
            <>
              {activeTab === 'home' && <HeroSection visualContent={visualContent} updateVisualContent={updateVisualContent} isEditMode={isVisualEditMode} />}
              {activeTab === 'home' && <HomeSection properties={publicProperties} loading={loading} onSelectProp={handleSelectProperty} setActiveTab={setActiveTab} onSearchCategory={handleFilterSelect} onSelectLocation={handleFilterSelect} onSearch={handleGlobalSearch} visualContent={visualContent} updateVisualContent={updateVisualContent} onUpdateLocationImage={handleLocationImageUpdate} onRemoveLocationImage={handleRemoveLocationImage} isEditMode={isVisualEditMode} />}
              {activeTab === 'promo' && <PropertiesList properties={publicProperties} searchParams={{ type: 'promo' }} onSelectProp={handleSelectProperty} visualContent={visualContent} updateVisualContent={updateVisualContent} isEditMode={isVisualEditMode} />}
              {activeTab === 'search_result' && <PropertiesList properties={publicProperties} searchParams={searchParams} onSelectProp={handleSelectProperty} visualContent={visualContent} updateVisualContent={updateVisualContent} isEditMode={isVisualEditMode} />}
              {activeTab === 'location' && <LocationSection onSelectLocation={handleFilterSelect} visualContent={visualContent} updateVisualContent={updateVisualContent} onUpdateLocationImage={handleLocationImageUpdate} isEditMode={isVisualEditMode} />}
              {activeTab === 'calculator' && <div className="py-16 bg-gray-50"><CalculatorSection visualContent={visualContent} updateVisualContent={updateVisualContent} isEditMode={isVisualEditMode} /></div>}
              {activeTab === 'portfolio' && <PortfolioSection companyInfo={companyInfo} properties={publicProperties} visualContent={visualContent} updateVisualContent={updateVisualContent} isEditMode={isVisualEditMode} openLightbox={openLightbox} />}
            </>
          )}
        </div>

        <footer className="bg-brand-green text-brand-light py-12 mt-auto relative z-30">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 font-light">
              <div className="reveal-on-scroll">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl tracking-[0.2em] font-light uppercase">{companyInfo?.name || 'STARTUP UP'}</span>
                </div>
                <p className="text-sm leading-relaxed opacity-80">{companyInfo?.description || 'จุดเริ่มต้นของคนอยากมีบ้าน'}</p>
              </div>
              <div className="reveal-on-scroll delay-100">
                <h4 className="font-normal mb-4 tracking-wider uppercase text-sm relative z-50">
                    <EditableText tag="span" fieldKey="contactTitle" content={visualContent} updateContent={updateVisualContent} isEditMode={isVisualEditMode} />
                </h4>
                <a href={isVisualEditMode ? "#" : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(companyInfo?.address)}`} onClick={(e)=>{if(isVisualEditMode)e.preventDefault()}} target={isVisualEditMode ? "_self" : "_blank"} rel="noopener noreferrer" className={`mb-2 text-sm opacity-80 block ${isVisualEditMode ? 'pointer-events-none opacity-50' : 'hover:text-white hover:underline'}`}>
                    {companyInfo?.address}
                </a>
                <p className="mb-2 text-lg"><a href={isVisualEditMode ? "#" : `tel:${companyInfo?.phone}`} onClick={(e)=>{if(isVisualEditMode)e.preventDefault()}} className={isVisualEditMode ? 'pointer-events-none opacity-50' : 'hover:text-white hover:underline'}>โทร: {companyInfo?.phone}</a></p>
                <p className="text-sm opacity-80">Email: {companyInfo?.email}</p>
              </div>
              <div className="reveal-on-scroll delay-200">
                 <h4 className="font-normal mb-4 tracking-wider uppercase text-sm relative z-50">
                    <EditableText tag="span" fieldKey="followTitle" content={visualContent} updateContent={updateVisualContent} isEditMode={isVisualEditMode} />
                 </h4>
                 <div className="flex gap-4">
                   <a href={isVisualEditMode ? "#" : companyInfo?.facebook} onClick={(e)=>{if(isVisualEditMode)e.preventDefault()}} target={isVisualEditMode ? "_self" : "_blank"} rel="noopener noreferrer" className={`transition ${isVisualEditMode ? 'pointer-events-none opacity-50' : 'hover:text-white opacity-80 hover:-translate-y-1'}`}><Facebook size={24}/></a>
                   <a href={isVisualEditMode ? "#" : "https://youtube.com/@startupupofficial?si=dmoPEcMTw5okXPMn"} onClick={(e)=>{if(isVisualEditMode)e.preventDefault()}} target={isVisualEditMode ? "_self" : "_blank"} rel="noopener noreferrer" className={`transition ${isVisualEditMode ? 'pointer-events-none opacity-50' : 'hover:text-white opacity-80 hover:-translate-y-1'}`}><Youtube size={24}/></a>
                   <a href={isVisualEditMode ? "#" : lineContactHref()} onClick={(e)=>{if(isVisualEditMode)e.preventDefault()}} target={isVisualEditMode ? "_self" : "_blank"} rel="noopener noreferrer" className={`transition ${isVisualEditMode ? 'pointer-events-none opacity-50' : 'hover:text-white opacity-80 hover:-translate-y-1'}`}><MessageCircle size={24}/></a>
                   <a href={isVisualEditMode ? "#" : "https://www.instagram.com/startupuprealestate/"} onClick={(e)=>{if(isVisualEditMode)e.preventDefault()}} target={isVisualEditMode ? "_self" : "_blank"} rel="noopener noreferrer" className={`transition ${isVisualEditMode ? 'pointer-events-none opacity-50' : 'hover:text-white opacity-80 hover:-translate-y-1'}`}><Instagram size={24}/></a>
                   <a href={isVisualEditMode ? "#" : "https://www.tiktok.com/@startupupofficial"} onClick={(e)=>{if(isVisualEditMode)e.preventDefault()}} target={isVisualEditMode ? "_self" : "_blank"} rel="noopener noreferrer" className={`transition ${isVisualEditMode ? 'pointer-events-none opacity-50' : 'hover:text-white opacity-80 hover:-translate-y-1'}`}><Video size={24}/></a>
                 </div>
              </div>
            </div>
            <div className="border-t border-white/20 pt-8 text-center text-xs opacity-60 font-light tracking-wide">
              © {new Date().getFullYear()} {companyInfo?.name || 'Startup Up Real Estate'}. All Rights Reserved.
            </div>
          </div>
        </footer>

        {isVisualEditMode && (
          <div className="fixed bottom-0 left-0 w-full bg-slate-900 text-white p-4 z-[9999] flex flex-col md:flex-row justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-full duration-300 gap-4">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex items-center gap-2 bg-blue-600 px-3 py-1.5 rounded-lg text-sm font-medium shadow">
                      <Layout size={16} /> โหมดแก้ไขหน้าตาเว็บไซต์
                  </div>
                  <span className="text-gray-400 text-sm hidden md:inline"><Type size={14} className="inline mr-1"/> คลิกไอคอนดินสอ เพื่อแก้ไขข้อความ หรือนำเมาส์ชี้ที่รูปทำเลเพื่อเปลี่ยนรูป</span>
              </div>
              
              <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
                  <button onClick={undoVisual} disabled={pastVisual.length===0} className="px-4 py-1.5 hover:bg-slate-700 rounded disabled:opacity-30 transition flex items-center gap-2 text-sm" title="ย้อนกลับ (Ctrl+Z)"><ChevronLeft size={16}/> Undo</button>
                  <div className="w-px bg-slate-700"></div>
                  <button onClick={redoVisual} disabled={futureVisual.length===0} className="px-4 py-1.5 hover:bg-slate-700 rounded disabled:opacity-30 transition flex items-center gap-2 text-sm" title="ทำซ้ำ (Ctrl+Y)">Redo <ChevronRight size={16}/></button>
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={cancelVisualEdit} className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-full font-medium transition flex-1 md:flex-none text-sm">ยกเลิก</button>
                  <button onClick={saveVisualEdit} disabled={isSavingVisual} className="px-6 py-2.5 bg-brand-green hover:bg-[#135c2a] rounded-full font-medium transition flex-1 md:flex-none flex items-center justify-center gap-2 text-sm shadow-lg disabled:opacity-50">
                      {isSavingVisual ? <Loader size={16} className="animate-spin"/> : <Save size={16}/>} บันทึกการแก้ไข
                  </button>
              </div>
          </div>
        )}

        <CustomAlertModal 
            isOpen={globalAlert.isOpen} type={globalAlert.type} title={globalAlert.title} 
            message={globalAlert.message} showCancel={globalAlert.showCancel} 
            onCancel={globalAlert.onCancel} onConfirm={globalAlert.onConfirm} 
        />

        {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onGoogleLogin={handleGoogleLogin} />}
        {showAdminPanel && (
          <AdminPanel 
              userRole={userRole} userEmail={userEmail} properties={properties} users={authorizedUsers} companyInfo={companyInfo} 
              onClose={() => setShowAdminPanel(false)} onLogout={handleLogout} db={db} appId={appId} popupData={popupData} locations={visualContent.locations || DEFAULT_LOCATIONS_DATA}
              enterVisualEditMode={() => { 
                  setShowAdminPanel(false); 
                  setSelectedProperty(null);
                  setActiveTab('home'); 
                  setTimeout(() => {
                      setIsVisualEditMode(true); 
                      window.scrollTo(0,0);
                  }, 100); 
              }}
              showAlert={showGlobalAlert} showConfirm={showGlobalConfirm}
          />
        )}

        {/* Render Lightbox */}
        <Lightbox isOpen={lightbox.isOpen} images={lightbox.images} startIndex={lightbox.startIndex} onClose={closeLightbox} />
      </div>
    </>
  );
}

/* ============================================================
   เปิดของข้างในให้ดีไซน์ใหม่ (pages/v4.js) หยิบไปใช้ซ้ำได้
   ทั้งหมดนี้เป็นตัวเดิมที่รันอยู่บนเว็บจริง ไม่ได้แก้พฤติกรรมอะไร
   ============================================================ */
export {
  // Firebase / ค่าคงที่ระบบ
  db, auth, appId, HOST_EMAIL, setDoc,
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
  LoginModal, CustomAlertModal, AdminPanel,
};
