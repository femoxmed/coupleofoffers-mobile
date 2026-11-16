const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const offer=id=>({id,title:id,venue_name:'Venue',price_kobo:100000,party_size:1,image_url:null});
function storeWith(storage,catalog){
 const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../store/useSavedStore.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const exports={};
 vm.runInNewContext(code,{exports,setTimeout,clearTimeout,require(name){
  if(name==='zustand')return require('zustand');
  if(name==='@react-native-async-storage/async-storage')return {__esModule:true,default:{getItem:async key=>storage.get(key)||null,setItem:async(key,value)=>storage.set(key,value),removeItem:async key=>storage.delete(key)}};
  if(name==='expo-secure-store')return {getItemAsync:async key=>storage.get(key)||null,setItemAsync:async(key,value)=>storage.set(key,value),deleteItemAsync:async key=>storage.delete(key)};
  if(name==='../services/catalog')return {catalogService:catalog};
  throw Error(name);
 }});
 return exports.useSavedStore;
}
test('guest saves merge only missing IDs on sign-in and sign-out isolates the next user',async()=>{
 const storage=new Map();
 let identity='a';const servers={a:[offer('server-a')],b:[offer('server-b')]};const writes=[];
 const store=storeWith(storage,{
  getSavedOffers:async()=>servers[identity],
  syncSavedOffers:async ids=>{writes.push([...ids]);for(const id of ids)if(!servers[identity].some(item=>item.id===id))servers[identity].push(offer(id));return servers[identity];},
  toggleSaveOffer:async()=>{},
 });
 await store.getState().fetchSaved();
 await store.getState().toggleSave(offer('guest'));
 await store.getState().toggleSave(offer('server-a'));
 await store.getState().fetchSaved('a@example.test');
 assert.deepEqual(writes,[['guest']]);
 assert.deepEqual(Array.from(store.getState().savedIds).sort(),['guest','server-a']);
 assert.equal(storage.has('coo_saved_offers_guest'),false);
 await store.getState().clearSaved('a@example.test');
 assert.equal(store.getState().savedOffers.length,0);
 identity='b';await store.getState().fetchSaved('b@example.test');
 assert.deepEqual(Array.from(store.getState().savedIds),['server-b']);
 await store.getState().clearSaved('b@example.test');
});
test('an in-flight fetch cannot restore the previous account after sign-out',async()=>{
 const storage=new Map([['coo_saved_offers_guest',JSON.stringify([offer('guest')])]]);
 let release;let started;
 const entered=new Promise(resolve=>started=resolve);
 const blocked=new Promise(resolve=>release=resolve);
 let writes=0;
 const store=storeWith(storage,{getSavedOffers:async()=>{started();await blocked;return [offer('old-account')];},syncSavedOffers:async()=>{writes++;return [];}});
 const fetching=store.getState().fetchSaved('old@example.test');await entered;
 const clearing=store.getState().clearSaved('old@example.test');release();await Promise.all([fetching,clearing]);
 assert.equal(writes,0);assert.equal(store.getState().savedOffers.length,0);assert.equal(storage.has('coo_saved_offers_guest'),false);
});
test('party pricing uses real base and extra-guest figures and never invents extra savings',()=>{
 const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../utils/pricing.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const exports={};vm.runInNewContext(code,{exports});
 const base={price_kobo:2500000,party_size:2,extra_friend_price_kobo:900000,regular_price_kobo:3200000,regular_extra_guest_kobo:1200000};
 assert.equal(exports.priceForParty(base,2).savingsKobo,700000);
 const quote=exports.priceForParty(base,4);assert.equal(quote.totalKobo,4300000);assert.equal(quote.regularTotalKobo,5600000);assert.equal(quote.savingsKobo,1300000);
 assert.equal(exports.priceForParty({...base,regular_extra_guest_kobo:null},4).savingsKobo,700000);
 assert.equal(exports.priceForParty({...base,extra_friend_price_kobo:0,regular_extra_guest_kobo:0},4).totalKobo,2500000);
});

test('guest collections larger than secure-storage limits remain available',async()=>{
 const storage=new Map();
 const store=storeWith(storage,{});
 await store.getState().fetchSaved();
 for(let i=0;i<30;i++)await store.getState().toggleSave(offer(`experience-${i}`));
 assert.ok(storage.get('coo_saved_offers_guest').length>2048);
 await store.getState().fetchSaved();
 assert.equal(store.getState().savedOffers.length,30);
 await store.getState().clearSaved();
});
test('sign-out clears saves immediately even when server sign-out and booking-cache cleanup fail',async()=>{
 const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../store/useAuthStore.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const exports={};let cleared=false;
 vm.runInNewContext(code,{exports,require(name){
  if(name==='zustand')return require('zustand');
  if(name==='../services/authService')return {authService:{logout:async()=>{assert.equal(cleared,true);throw Error('offline');}}};
  if(name==='../services/apiClient')return {};
  if(name==='../services/checkoutService')return {checkoutService:{clearUserBookings:async()=>{throw Error('storage unavailable');}}};
  if(name==='./useSavedStore')return {useSavedStore:{getState:()=>({clearSaved:async()=>{cleared=true;}})}};
  throw Error(name);
 }});
 const store=exports.useAuthStore;
 store.setState({user:{email:'old@example.test'},token:'old-token'});
 await assert.rejects(store.getState().logout(),/offline/);
 assert.equal(cleared,true);assert.equal(store.getState().user,null);assert.equal(store.getState().token,null);assert.equal(store.getState().isLoading,false);
});
