// Original vector editorial illustrations; no stock photos or third-party artwork.
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('public/articles');fs.mkdirSync(out,{recursive:true});
const motifs={
 fees:'<text x="0" y="36" text-anchor="middle" font-size="94" font-weight="600" fill="#174b34">0.01<tspan font-size="36">%</tspan></text>',
 mortgage:'<path d="M-65-65h100l40 40v130H-65zM35-65v40h40M-35-5h65M-35 23h65M-35 51h35"/>',
 budget:'<rect x="-60" y="-76" width="120" height="160" rx="14"/><path d="M-39-52h78v34h-78zM-35 9h6m34 0h6m25 0h6M-35 37h6m34 0h6m25 0h6M-35 65h6m34 0h6m25 0h6"/>',
 credit:'<circle r="70"/><path d="M-30 2l22 24 43-53M-100 88h200"/>',
 freelance:'<rect x="-85" y="-33" width="170" height="112" rx="14"/><path d="M-35-33v-28h70v28M-85 7q85 45 170 0M-12 19h24v25h-24z"/>',
 steps:'<path d="M-80 70h50V20h50v-50h50v-50M-70-60l25 25 45-45"/>',
 contract:'<path d="M-70-75h105v160H-70zM-45-45H5M-45-15H5M-45 15h30M-5 70l18-42 58-58 24 24-58 58z"/>',
 transfer:'<circle cx="-30" cy="-15" r="44"/><path d="M5 15l70 70m-28-28 22-22M-30-27v24"/>',
 choices:'<path d="M0 80V0m0 20-70-55M0 20l70-55M-90-25l20-10 5 24M90-25 70-35l-5 24M0-85v60"/>',
 inspection:'<circle cx="-16" cy="-14" r="58"/><path d="M27 29l55 55M-45-10l20 20 37-40"/>',
 renovation:'<path d="M-65 75 45-35M20-70q70-20 70 45L62-5 32-35 20-70M-75-55l30-20 100 135-25 20z"/>',
 townhouse:'<path d="M-95-5-47-50 0-5 47-50 95-5M-80-18v100h160V-18M0-5v87M-55 30h25v30h-25zM30 30h25v30H30z"/>',
 corner:'<path d="M-75 65V-25L0-65l75 40v90L0 95zM0-65v160M-75-25 0 15l75-40M30 25v30l25-13V12"/>',
 sunlight:'<circle r="45"/><path d="M0-95v25M0 70v25M-95 0h25M70 0h25M-67-67l18 18M49 49l18 18M67-67-18 18M-49 49l-18 18"/>',
 location:'<path d="M0 88q-75-80-65-120a67 67 0 0 1 130 0Q75 8 0 88z"/><circle cy="-24" r="24"/>',
 pruksa:'<path d="M0 85V-10M0 35q-90 0-75-75 75 0 75 75M0 0q85 0 75-80Q0-80 0 0"/>',
 university:'<path d="m-100-25 100-50 100 50L0 25zM-60-5v50q60 50 120 0V-5M100-25v95"/>',
 industry:'<path d="M-90 80V-5l60-35v40l60-35v115zM30 80h60V-75H60V5M-65 35h10m20 0h10M60 35h10"/>',
 flood:'<path d="M-95 40q25-20 50 0t50 0 50 0 50 0M-95 75q25-20 50 0t50 0 50 0 50 0M0-90q-60 70 0 90 60-20 0-90z"/>',
};
for(const [name,motif] of Object.entries(motifs)){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640" width="960" height="640"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#42674c" stroke-opacity=".07"/></pattern><filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#173e29" flood-opacity=".12"/></filter></defs><rect width="960" height="640" fill="#eceadd"/><rect width="960" height="640" fill="url(#grid)"/><circle cx="755" cy="86" r="190" fill="#d8e2cd"/><path d="M0 485Q200 405 410 500T960 455V640H0z" fill="#d6ddc8"/><path d="M0 562Q300 495 590 565T960 550" fill="none" stroke="#bdc9b0" stroke-width="2"/><g transform="translate(130 185)"><path d="M0 115 170-20l170 135" fill="#557858" stroke="#244e36" stroke-width="9" stroke-linejoin="round"/><path d="M30 100 170-10l140 110v210H30z" fill="#fff7e6"/><path d="M30 100 170-10l140 110" fill="none" stroke="#244e36" stroke-width="9"/><rect x="65" y="145" width="68" height="80" rx="4" fill="#b7c9b6"/><path d="M99 145v80M65 185h68" stroke="#fff7e6" stroke-width="5"/><rect x="183" y="140" width="76" height="170" rx="4" fill="#335e40"/><circle cx="242" cy="225" r="5" fill="#d9bb7b"/><path d="M0 316h340" stroke="#244e36" stroke-width="10" stroke-linecap="round"/></g><g transform="translate(582 324)" filter="url(#shadow)"><rect x="-157" y="-178" width="314" height="340" rx="22" fill="#fffaf0" transform="rotate(5)"/><rect x="-148" y="-180" width="296" height="340" rx="18" fill="#fdf9ee"/><path d="M-100-120h200" stroke="#dedbc5" stroke-width="3"/><g fill="none" stroke="#24593c" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" font-family="Arial,sans-serif">${motif}</g><path d="M-75 125h150" stroke="#c5ad76" stroke-width="5" stroke-linecap="round"/></g><g transform="translate(800 430)"><path d="M0 100V-30" stroke="#527045" stroke-width="7"/><ellipse cx="-20" cy="-10" rx="25" ry="44" transform="rotate(-35)" fill="#799268"/><ellipse cx="24" cy="-30" rx="25" ry="48" transform="rotate(28)" fill="#5b7e50"/><path d="M-35 80h70l-10 55h-50z" fill="#c5ad76"/></g></svg>`;
 fs.writeFileSync(path.join(out,name+'.svg'),svg);
}
console.log(`Generated ${Object.keys(motifs).length} original SVG covers`);
