// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require('node:assert/strict');
async function checkPickerShadows(page, menu) {
 const id = await menu.getAttribute('id');
 const original = await menu.evaluate(e=>e.scrollTop);
 const layer = menu.locator('..').locator('.mm-picker-scroll-shadows');
 const check = async(top,bottom)=>{
  await page.waitForFunction(({id,top,bottom})=>{
   const e=document.getElementById(id),s=e.parentElement.querySelector('.mm-picker-scroll-shadows');
   return !s.hidden&&s.dataset.top===String(top)&&s.dataset.bottom===String(bottom);
  },{id,top,bottom});
  await layer.evaluate(async e=>{await Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));});
  assert(await layer.evaluate((e,{top,bottom})=>Number(getComputedStyle(e,'::before').opacity)===Number(top)&&Number(getComputedStyle(e,'::after').opacity)===Number(bottom),{top,bottom}));
  assert(await layer.evaluate(e=>{const s=getComputedStyle(e);return e.getAttribute('aria-hidden')==='true'&&s.pointerEvents==='none'&&getComputedStyle(e,'::before').backgroundImage.includes('linear-gradient')&&getComputedStyle(e,'::after').backgroundImage.includes('linear-gradient');}));
  assert(await menu.evaluate(e=>{const m=e.getBoundingClientRect(),s=e.parentElement.querySelector('.mm-picker-scroll-shadows').getBoundingClientRect();return ['left','top','width','height'].every(k=>Math.abs(m[k]-s[k])<1.1);}));
 };
 await menu.evaluate(e=>{e.scrollTop=0;});
 const overflow=await menu.evaluate(e=>e.scrollHeight-e.clientHeight>1);
 await check(false,overflow);
 const before=await menu.evaluate(e=>e.getBoundingClientRect().toJSON());
 await layer.evaluate(e=>{e.hidden=true;});
 assert.deepEqual(await menu.evaluate(e=>e.getBoundingClientRect().toJSON()),before);
 await layer.evaluate(e=>{e.hidden=false;});
 assert.deepEqual(await menu.evaluate(e=>e.getBoundingClientRect().toJSON()),before);
 if(overflow){
  // Even a partially exposed option under the shade remains directly clickable.
  assert(await menu.evaluate(e=>{const r=e.getBoundingClientRect(),y=r.bottom-12,x=r.left+30;return document.elementFromPoint(x,y)?.closest('[role=option]')?.parentElement===e;}));
  await menu.evaluate(e=>{e.scrollTop=(e.scrollHeight-e.clientHeight)/2;});await check(true,true);
  await menu.evaluate(e=>{e.scrollTop=e.scrollHeight;});await check(true,false);
 }
 await menu.evaluate((e,top)=>{e.scrollTop=top;},original);
 const max=await menu.evaluate(e=>e.scrollHeight-e.clientHeight);await check(original>1,max-original>1);
 return overflow;
}
module.exports={checkPickerShadows};
