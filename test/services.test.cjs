const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadService(file, apiClient, storage = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname,'../services',file),'utf8');
  const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const exports = {};
  vm.runInNewContext(js,{exports,console,URL,Date,Math,AbortController,setTimeout,clearTimeout,...globals,require(name){
    if (name==='./apiClient') return {apiClient,...storage};
    if (name==='expo-secure-store') return {setItemAsync:async()=>{},deleteItemAsync:async()=>{},...storage};
    if (name==='@react-native-async-storage/async-storage') return {default:{getItem:async()=>null,setItem:async()=>{},removeItem:async()=>{}},getItem:async()=>null,setItem:async()=>{},removeItem:async()=>{},...storage};
    if (name==='../constants/config') return {Config:{},resolveImageUrl:value=>value};
    throw new Error('Unexpected import: '+name);
  }});
  return exports;
}

test('empty API collections stay empty and failed requests never supply demo catalogue records',async()=>{
  const {catalogService:empty}=loadService('catalog.ts',async()=>[]);
  for (const method of ['getOffers','getPartners','getHomepageSlides','getSavedOffers']) {
    assert.equal((await empty[method]()).length,0,method);
  }
  const {catalogService:failed}=loadService('catalog.ts',async()=>{throw new Error('API unavailable');});
  for (const [method,args] of [['getOffers',[]],['getPartners',[]],['getHomepageSlides',[]],['getOfferById',['missing']],['getPartnerBySlug',['missing']]]) {
    await assert.rejects(failed[method](...args),/API unavailable/);
  }
});

test('offer availability uses API slots and does not generate inventory',async()=>{
  const {catalogService}=loadService('catalog.ts',async()=>({id:'offer',slots:[{id:'slot',available:0,booking_closes_at:'2026-12-01T10:00:00Z'}]}));
  const offer=await catalogService.getOfferById('offer');
  assert.equal(offer.slots.length,1);
  assert.equal(offer.slots[0].remaining_units,0);
  assert.equal(offer.slots[0].cutoff_at,'2026-12-01T10:00:00Z');
  const {catalogService:empty}=loadService('catalog.ts',async()=>({id:'offer',slots:[]}));
  assert.equal((await empty.getOfferById('offer')).slots.length,0);
});

test('partner detail preserves real minimum and does not invent packages or gallery photos',async()=>{
  const {catalogService}=loadService('catalog.ts',async()=>({starting_price_kobo:1200000,packages:[],gallery:[]}));
  const partner=await catalogService.getPartnerBySlug('qa-ember-lekki');
  assert.equal(partner.starting_price_kobo,1200000);
  assert.equal(partner.packages.length,0);
  assert.equal(partner.gallery.length,0);
});

test('failed login or signup cannot create a fake user or token',async()=>{
  let writes=0;
  const {authService}=loadService('authService.ts',async()=>{throw new Error('Network request failed');},{
    setAuthToken:async()=>{writes++;},setStoredUser:async()=>{writes++;},
  });
  await assert.rejects(authService.login('demo@test.test','password123'),/Network request failed/);
  await assert.rejects(authService.signup('test@test.test','password123'),/Network request failed/);
  assert.equal(writes,0);
});

test('checkout, rescheduling, refunds and support propagate server failures',async()=>{
  const {checkoutService}=loadService('checkoutService.ts',async()=>{throw new Error('API unavailable');});
  const operations=[
    ()=>checkoutService.initBachsCheckout({offerId:'offer',slotId:'slot',partySize:2,totalKobo:1200000,email:'customer@test.test'}),
    ()=>checkoutService.getBookings('customer@test.test'),
    ()=>checkoutService.getRescheduleSlots('booking'),
    ()=>checkoutService.rescheduleBooking('booking','slot','tomorrow','2026-12-01'),
    ()=>checkoutService.requestRefund('booking','Change of plans'),
    ()=>checkoutService.submitSupportTicket({name:'Test',email:'customer@test.test',topic:'Booking',message:'Help'}),
  ];
  for (const operation of operations) await assert.rejects(operation(),/API unavailable/);
});

test('legacy fake tokens are discarded and real guest session cookies persist for checkout',async()=>{
  const stored=new Map([['coo_auth_token','demo_tok_123'],['coo_auth_user','{"email":"demo@test.test"}']]);
  const storage={getItemAsync:async key=>stored.get(key)||null,setItemAsync:async(key,value)=>stored.set(key,value),deleteItemAsync:async key=>stored.delete(key)};
  const calls=[];
  const service=loadService('apiClient.ts',null,storage,{fetch:async(url,options)=>{
    calls.push(options.headers);
    return new Response(null,{status:204,headers:calls.length===1?{'set-cookie':'coo_guest=real-session; Path=/; HttpOnly'}:{}});
  }});
  assert.equal(await service.getAuthToken(),null);
  assert.equal(stored.has('coo_auth_user'),false);
  await service.apiClient('/api/v1/offers/session',{method:'POST'});
  await service.apiClient('/api/v1/offers/offer/checkout',{method:'POST'});
  assert.equal(calls[1].Cookie,'coo_guest=real-session');
});

test('public requests and guest checkout continue when secure storage is unavailable',async()=>{
  const calls=[];
  const service=loadService('apiClient.ts',null,{
    getItemAsync:async()=>{throw new Error('Storage unavailable');},
    setItemAsync:async()=>{throw new Error('Storage unavailable');},
  },{fetch:async(url,options)=>{
    calls.push(options.headers);
    if (calls.length===1) return new Response('[]',{status:200});
    if (calls.length===2) return new Response(null,{status:204,headers:{'set-cookie':'coo_guest=real-guest; Path=/; HttpOnly'}});
    return new Response('{"reference":"real-reference"}',{status:200});
  }});
  assert.equal((await service.apiClient('/api/v1/partners')).length,0);
  await service.apiClient('/api/v1/offers/session',{method:'POST'});
  await service.apiClient('/api/v1/offers/offer/checkout',{method:'POST'});
  assert.equal(calls[2].Cookie,'coo_guest=real-guest');
});

test('native signout clears account and guest sessions and requests omit automatic cookies',async()=>{
 const stored=new Map([['coo_auth_token','account-a-token'],['coo_auth_user','{"email":"a@example.test"}'],['coo_guest_cookie','coo_guest=old-guest']]);
 const calls=[];
 const storage={getItemAsync:async key=>stored.get(key)||null,setItemAsync:async(key,value)=>stored.set(key,value),deleteItemAsync:async key=>stored.delete(key)};
 const service=loadService('apiClient.ts',null,storage,{fetch:async(url,options)=>{calls.push(options);return Response.json([]);}});
 assert.equal(await service.getAuthToken(),'account-a-token');
 await service.removeAuthToken();assert.equal(await service.getAuthToken(),null);
 await service.apiClient('/api/v1/offers');
 assert.equal(calls[0].credentials,'omit');assert.equal(calls[0].headers.Authorization,undefined);assert.equal(calls[0].headers.Cookie,undefined);
 assert.equal(stored.size,0);
});

test('missing catalogue covers stay empty instead of becoming stock photos',async()=>{
 const {catalogService}=loadService('catalog.ts',async endpoint=>endpoint==='/api/v1/offers'?[{id:'offer',image_url:null}]:endpoint==='/api/v1/partners'?[{id:'venue',banner_url:null}]:{id:'venue',banner_url:null,packages:[{id:'offer',image_url:null}],gallery:[]});
 assert.equal((await catalogService.getOffers())[0].image_url,null);
 assert.equal((await catalogService.getPartners())[0].banner_url,null);
 const detail=await catalogService.getPartnerBySlug('venue');
 assert.equal(detail.banner_url,null);assert.equal(detail.packages[0].image_url,null);assert.equal(detail.gallery.length,0);
});
