/* Ingram Command shared feed client. No business data lives in this repo: the page reads a
   private feed with a key passed in the link (#k=...). The key is kept in this browser only. */
(function(){
const FEED='https://eukxhihauxtaidbalzfg.supabase.co/functions/v1/cc-feed';
const TZ='America/Los_Angeles';
const CC=window.CC={FEED,TZ};
CC.key=function(){
  const m=location.hash.match(/[#&]k=([^&]+)/);
  if(m){try{localStorage.setItem('cc_k',decodeURIComponent(m[1]))}catch(e){} return decodeURIComponent(m[1]);}
  try{return localStorage.getItem('cc_k')}catch(e){return null}
};
CC.load=async function(extra){
  const k=CC.key(); if(!k) throw Object.assign(new Error('NO KEY'),{code:'nokey'});
  const ctl=new AbortController(); const t=setTimeout(()=>ctl.abort(),25000);
  try{
    const r=await fetch(FEED+'?k='+encodeURIComponent(k)+(extra||''),{cache:'no-store',signal:ctl.signal});
    if(r.status===403) throw Object.assign(new Error('KEY REJECTED'),{code:'badkey'});
    if(!r.ok) throw Object.assign(new Error('FEED HTTP '+r.status),{code:'http'});
    const j=await r.json(); if(!j.ok) throw Object.assign(new Error('FEED ERROR'),{code:'feed'});
    return j;
  }finally{clearTimeout(t)}
};
CC.post=async function(body){
  const k=CC.key(); const r=await fetch(FEED,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.assign({k},body))});
  return r.json();
};
CC.hours=iso=>iso?(Date.now()-new Date(iso).getTime())/36e5:Infinity;
CC.days=d=>d?Math.floor((Date.now()-new Date(d+(d.length===10?'T12:00:00-08:00':'')).getTime())/864e5):null;
CC.ago=function(iso){if(!iso)return 'never';const m=(Date.now()-new Date(iso).getTime())/6e4;
  if(m<1.5)return 'just now';if(m<60)return Math.round(m)+'m ago';const h=m/60;if(h<36)return Math.round(h)+'h ago';return Math.round(h/24)+'d ago';};
CC.time=(iso,o)=>new Date(iso||Date.now()).toLocaleString('en-US',Object.assign({timeZone:TZ},o||{hour:'numeric',minute:'2-digit'}));
CC.clock=()=>CC.time(null,{hour:'numeric',minute:'2-digit'});
CC.date=()=>CC.time(null,{weekday:'long',month:'long',day:'numeric'});
CC.money=n=>'$'+Math.round(+n||0).toLocaleString('en-US');
CC.esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* snapshot: {data, source, updated_at, state:'live'|'stale'|'nofeed'}; stale = older than limit hours */
CC.snap=function(feed,name,limitH){const s=feed&&feed.snapshots&&feed.snapshots[name];
  if(!s||!s.data) return {data:null,state:'nofeed',source:'not connected'};
  return Object.assign({},s,{state:CC.hours(s.updated_at)>(limitH||0.75)?'stale':'live'});};
CC.ageClass=d=>d==null?'':d>=7?'red':d>=3?'amber':'';
/* shared derivations so TV and desktop show the same numbers */
CC.derive=function(f){
  const S=n=>CC.snap(f,n,n==='sites'?0.5:0.75);
  const needs=S('needs_joe'),blocked=S('blocked'),agents=S('agents'),sites=S('sites'),biz=S('businesses'),relay=S('relay'),projects=S('projects'),registry=S('registry');
  const roster=agents.data?agents.data.roster:[];
  const sitesL=sites.data?sites.data.sites:[];
  const reg=registry.data||{};
  const tiles=(biz.data?biz.data.items:[]).map(b=>{const hosts=b.sites||[];const ss=sitesL.filter(s=>hosts.includes(s.host));const down=ss.filter(s=>!s.up);
    let st=b.status;if(down.length)st='down';else if(st==='no_feed'&&ss.length)st='site_ok';return Object.assign({},b,{status:st,site_up:ss.length-down.length,site_total:ss.length,down:down.map(s=>s.host)});});
  const fresh=['needs_joe','blocked','agents','sites','businesses','relay','projects'].map(n=>({n,s:S(n)}));
  return {needs,blocked,agents,sites,biz,relay,projects,registry,roster,tiles,sitesL,reg,
    needsItems:needs.data?needs.data.items:[],blockedItems:blocked.data?blocked.data.items:[],
    working:roster.filter(r=>r.state==='working').length,active:roster.filter(r=>r.state!=='quiet').length,
    sitesUp:sitesL.filter(s=>s.up).length,sitesTotal:sitesL.length,
    fresh,freshN:fresh.filter(x=>x.s.state==='live').length,staleList:fresh.filter(x=>x.s.state!=='live').map(x=>x.n)};
};
})();
