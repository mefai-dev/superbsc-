import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const API = '/superbsc/api/intelligence';
const R = 5, SP = 0.55, TW = 0.22;

const MAJ = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','DOTUSDT','LINKUSDT','LTCUSDT','MATICUSDT'];
const EXTRA = ['ARBUSDT','OPUSDT','APTUSDT','SUIUSDT','SEIUSDT','TIAUSDT','JUPUSDT','WIFUSDT','PENDLEUSDT','INJUSDT','FETUSDT','RNDRUSDT','NEARUSDT','FILUSDT','ATOMUSDT','ALGOUSDT','FTMUSDT','SANDUSDT','MANAUSDT','GALAUSDT','AXSUSDT','UNIUSDT','AAVEUSDT','MKRUSDT','COMPUSDT','SNXUSDT','CRVUSDT','LDOUSDT','SSVUSDT','EIGENUSDT','ENAUSDT','STXUSDT','ORDIUSDT','RUNEUSDT','CFXUSDT','KASUSDT','ONDOUSDT','WOOUSDT','BLURUSDT','DYDXUSDT'];

let D = [], scene, cam, ren, ctrl, ray, mouse, clk;
let nds = [], rng = [], glo = [], lbl = [], bra = [];
let bbL, bbR, pts1, pts2, sel = null, hov = null, avgATR = 1;
const $ = id => document.getElementById(id);
const mob = () => innerWidth < 768;

// ═══ FETCH ═══
async function load() {
  const t0 = performance.now();
  const res = await Promise.all([
    `${API}/smart-money`, `${API}/funding-scan?top_n=50`,
    `${API}/regime`, `${API}/basis-spread?top_n=50`, `${API}/accumulation`,
  ].map(u => fetch(u).then(r => r.json()).catch(() => null)));
  const ms = ((performance.now() - t0) / 1000).toFixed(1);
  merge(...res);
  $('data-dot').className = res[0] ? 'dot ok' : 'dot err';
  $('last-update').textContent = now() + ' (' + ms + 's)';
  $('sb-time').textContent = now();
  updateOverlays(res[2], res[1], res[3]);
  updateFeeds();
}
function now() { return new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' }) + ' UTC'; }

function merge(sm, fund, reg, bas, acc) {
  const m = {};
  const smList = sm?.results || MAJ.map((s,i) => ({
    symbol: s, composite: 50+Math.random()*30-15, bias: Math.random()>.5?'BULLISH':'BEARISH', factors: {}
  }));
  // Add extra mock symbols for a fuller helix (no extra API calls)
  for (const s of EXTRA) {
    if (!smList.find(x=>x.symbol===s)) {
      smList.push({symbol:s, composite:30+Math.random()*45, bias:Math.random()>.5?'BULLISH':'BEARISH', factors:{}});
    }
  }
  for (const i of smList) m[i.symbol] = {
    s: i.symbol, comp: i.composite||50, bias: i.bias||'NEUTRAL', fac: i.factors||{},
    fr: 0, fdir: '', apr: 0,
    reg: 'RANGING', atr: 1, adx: 15, volc: 0,
    bp: 0, bs: 'FLAT',
    ac: 50, as: 'MOD', asc: {},
    rsi: 0, macd: 0, oi: 0, sig: 0.35,
    bull: 0, bear: 0, ten: 0, glow: false,
  };

  if (fund?.results) for (const i of fund.results) {
    if (!m[i.symbol]) continue;
    m[i.symbol].fr = i.funding_rate||0;
    m[i.symbol].fdir = i.direction||'';
    m[i.symbol].apr = i.annualized_apr||0;
  }
  if (fund?.summary) {
    const a = fund.summary.avg_rate_pct;
    mv('v-fund', (a>=0?'+':'')+a.toFixed(4)+'%', a>=0?'up':'dn');
  }

  let aS=0, aN=0;
  if (reg?.results) for (const i of reg.results) {
    if (m[i.symbol]) {
      m[i.symbol].reg = i.regime||'RANGING';
      m[i.symbol].atr = i.indicators?.atr_pct||1;
      m[i.symbol].adx = i.indicators?.adx||15;
      m[i.symbol].volc = i.indicators?.volume_change_pct||0;
    }
    if (i.indicators?.atr_pct) { aS += i.indicators.atr_pct; aN++; }
  }
  avgATR = aN>0 ? aS/aN : 1;
  mv('v-atr', avgATR.toFixed(2)+'%', avgATR>2?'dn':'');
  if (reg?.regime_summary) {
    let mx=0, dom='RANGING';
    for (const [r, s] of Object.entries(reg.regime_summary)) if (s.length>mx) { mx=s.length; dom=r; }
    mv('v-regime', dom.replace('_',' '), '');
  }

  if (bas?.results) for (const i of bas.results) {
    if (!m[i.symbol]) continue;
    m[i.symbol].bp = i.basis_pct||0;
    m[i.symbol].bs = i.state||'FLAT';
  }
  if (bas?.summary) mv('v-basis', 'C:'+bas.summary.contango_count+' B:'+bas.summary.backwardation_count,
    bas.summary.contango_count > bas.summary.backwardation_count ? 'up':'dn');

  if (acc?.results) for (const i of acc.results) {
    if (!m[i.symbol]) continue;
    m[i.symbol].ac = i.composite||50;
    m[i.symbol].as = i.signal||'MOD';
    m[i.symbol].asc = i.scores||{};
  }

  const syms = Object.keys(m);
  let bulls=0, bears=0, cS=0, rsiS=0, macdS=0;
  for (const s of syms) {
    const d = m[s];
    const idx = MAJ.indexOf(s);
    const eidx = EXTRA.indexOf(s);
    d.sig = idx>=0 ? 1.0-idx*0.04 : eidx>=0 ? 0.35-eidx*0.004 : 0.2;
    // mock RSI from composite + adx
    d.rsi = Math.max(15, Math.min(85, d.comp*0.55 + d.adx*0.9 + (d.fr<0?6:-6) + (Math.random()-0.5)*8));
    // mock MACD from momentum
    d.macd = (d.comp-50)*0.03 + d.fr*20 + (d.volc*0.01);
    d.oi = d.volc*0.7 + (d.fr<0?3:-3);
    d.bull = (d.comp/100*0.4) + (d.ac/100*0.3) + (d.fr<0?Math.min(Math.abs(d.fr)*10,0.3):0);
    d.bear = ((100-d.comp)/100*0.4) + ((100-d.ac)/100*0.3) + (d.fr>0?Math.min(d.fr*10,0.3):0);
    d.ten = Math.abs(d.bull-d.bear);
    d.glow = Math.abs(d.fr)>0.03 || d.reg==='VOLATILE_BREAKOUT';
    if (d.bias==='BULLISH') bulls++; else if (d.bias==='BEARISH') bears++;
    cS += d.comp; rsiS += d.rsi; macdS += d.macd;
  }
  mv('v-bull', bulls, 'up'); mv('v-bear', bears, 'dn');
  mv('v-comp', syms.length?(cS/syms.length).toFixed(1):'—', '');
  mv('v-rsi', syms.length?(rsiS/syms.length).toFixed(1):'—', '');
  mv('v-macd', syms.length?(macdS/syms.length).toFixed(3):'—', macdS>=0?'up':'dn');
  mv('v-vol', syms.length? (syms.reduce((a,s)=>a+Math.abs(m[s].volc),0)/syms.length).toFixed(1)+'%' :'—', '');
  $('sym-count').textContent = syms.length+' sym';
  $('sb-sym').textContent = syms.length+' symbols';

  D = syms.sort((a,b)=> {
    const ia=MAJ.indexOf(a), ib=MAJ.indexOf(b);
    if (ia>=0&&ib>=0) return ia-ib;
    if (ia>=0) return -1; if (ib>=0) return 1;
    return (m[b].comp||0)-(m[a].comp||0); // by composite descending
  }).map(s=>m[s]);
}
function mv(id,v,c) { const e=$(id); e.textContent=v; e.className='met-v '+(c||''); }

// ═══ OVERLAYS ═══
function updateOverlays(reg, fund, bas) {
  if (reg?.results) $('cov-reg').innerHTML = reg.results.slice(0,10).map(r =>
    `<div class="cov-r"><span class="s">${r.symbol.replace('USDT','')}</span><span class="${r.regime==='VOLATILE_BREAKOUT'?'dn':r.regime==='TRENDING'?'up':''}">${r.regime.replace('_',' ')}</span></div>`).join('');

  if (fund?.results) {
    const ex = [...fund.results].filter(f=>MAJ.includes(f.symbol)||Math.abs(f.funding_rate)>0.01)
      .sort((a,b)=>Math.abs(b.funding_rate)-Math.abs(a.funding_rate)).slice(0,8);
    $('cov-fund').innerHTML = ex.map(f=>`<div class="cov-r"><span class="s">${f.symbol.replace('USDT','')}</span><span class="${f.funding_rate<0?'up':'dn'}">${(f.funding_rate*100).toFixed(3)}%</span></div>`).join('');
  }

  if (bas?.results) {
    const t = [...bas.results].filter(b=>!b.symbol.includes('_')&&(MAJ.includes(b.symbol)||Math.abs(b.basis_pct)>0.3))
      .sort((a,b)=>Math.abs(b.basis_pct)-Math.abs(a.basis_pct)).slice(0,8);
    $('cov-bas').innerHTML = t.map(b=>`<div class="cov-r"><span class="s">${b.symbol.replace('USDT','')}</span><span class="${b.state==='CONTANGO'?'up':b.state==='BACKWARDATION'?'dn':''}">${b.basis_pct.toFixed(3)}%</span></div>`).join('');
  }

  // RSI/MACD overlay
  $('cov-rsi').innerHTML = D.slice(0,10).map(d => {
    const rc = d.rsi>70?'dn':d.rsi<30?'up':'';
    const mc = d.macd>=0?'up':'dn';
    return `<div class="cov-r"><span class="s">${d.s.replace('USDT','')}</span><span class="${rc}">${d.rsi.toFixed(0)}</span><span class="${mc}">${d.macd>=0?'+':''}${d.macd.toFixed(2)}</span></div>`;
  }).join('');
}

// ═══ DATA FLY PARTICLES ═══
let flyTimer;
function startDataFly() {
  if (flyTimer) clearInterval(flyTimer);
  flyTimer = setInterval(spawnFly, 500);
}
// Project 3D node position → 2D screen coords relative to canvas-wrap
function nodeToScreen(nodeIdx) {
  if (!nds[nodeIdx] || !cam || !ren) return null;
  const v = nds[nodeIdx].position.clone().project(cam);
  const rect = ren.domElement.getBoundingClientRect();
  return { x: (v.x*.5+.5)*rect.width, y: (-.5*v.y+.5)*rect.height };
}
function spawnFly() {
  if (mob() || !D.length || !nds.length) return;
  const wrap=$('canvas-wrap'); if(!wrap) return;
  const rect=wrap.getBoundingClientRect();
  // Pick a random target node
  const ni = Math.floor(Math.random()*Math.min(nds.length, D.length));
  const target = nodeToScreen(ni);
  if (!target) return;
  const d = D[ni];
  // Pick random corner as origin
  const corners = [
    {sx:12,sy:28,gen:()=>({t:d.reg.replace('_',' '),c:d.reg==='VOLATILE_BREAKOUT'?'#f6465d':d.reg==='TRENDING'?'#0ecb81':'#f0b90b'})},
    {sx:rect.width-12,sy:28,gen:()=>({t:(d.fr*100).toFixed(3)+'%',c:d.fr<0?'#0ecb81':'#f6465d'})},
    {sx:12,sy:rect.height-16,gen:()=>({t:d.bp.toFixed(3)+'%',c:d.bs==='CONTANGO'?'#0ecb81':d.bs==='BACKWARDATION'?'#f6465d':'#848e9c'})},
    {sx:rect.width-12,sy:rect.height-16,gen:()=>{const r=Math.random();return r<.5?{t:'RSI '+d.rsi.toFixed(0),c:d.rsi>70?'#f6465d':d.rsi<30?'#0ecb81':'#f0b90b'}:{t:'MACD '+(d.macd>=0?'+':'')+d.macd.toFixed(2),c:d.macd>=0?'#0ecb81':'#f6465d'};}}
  ];
  const cn = corners[Math.floor(Math.random()*4)];
  const {t,c} = cn.gen();
  const el = document.createElement('span');
  el.className = 'dfly';
  el.textContent = d.s.replace('USDT','')+' '+t;
  el.style.color = c;
  el.style.left = cn.sx+'px';
  el.style.top = cn.sy+'px';
  wrap.appendChild(el);
  // Animate from corner to node position
  const dx = target.x - cn.sx, dy = target.y - cn.sy;
  el.animate([
    {transform:'translate(0,0) scale(1.2)',opacity:0},
    {opacity:1,offset:.08},
    {opacity:.85,offset:.5},
    {transform:`translate(${dx}px,${dy}px) scale(.35)`,opacity:0}
  ],{duration:2400,easing:'ease-in',fill:'forwards'});
  setTimeout(()=>el.remove(),2500);
}

// ═══ FEEDS ═══
function updateFeeds() {
  $('feed-left').innerHTML = D.map(d => {
    const c = d.comp>=60?'--up':d.comp<=40?'--dn':'--acc';
    return `<div class="fr" data-s="${d.s}"><span class="fr-s">${d.s.replace('USDT','')}</span><span class="fr-v" style="color:var(${c})">${d.comp.toFixed(1)}</span><div class="bar"><div class="bar-f" style="width:${d.comp}%;background:var(${c})"></div></div><span class="fr-v ${d.bias==='BULLISH'?'up':'dn'}">${d.bias==='BULLISH'?'▲':'▼'}</span></div>`;
  }).join('');
  $('feed-left').querySelectorAll('.fr').forEach(r=>r.onclick=()=>{const d=D.find(x=>x.s===r.dataset.s);if(d)showDet(d);});

  $('feed-right').innerHTML = D.map(d => {
    const c = d.ac>=70?'--up':d.ac>=40?'--acc':'--dn';
    return `<div class="fr" data-s="${d.s}"><span class="fr-s">${d.s.replace('USDT','')}</span><span class="fr-v" style="color:var(${c})">${d.ac.toFixed(1)}</span><div class="bar"><div class="bar-f" style="width:${d.ac}%;background:var(${c})"></div></div><span class="fr-v" style="color:var(--txm)">${d.as.slice(0,3)}</span></div>`;
  }).join('');
  $('feed-right').querySelectorAll('.fr').forEach(r=>r.onclick=()=>{const d=D.find(x=>x.s===r.dataset.s);if(d)showDet(d);});
}

// ═══ SIGNALS ═══
let sigHistory = [];
function genSignals() {
  if (!D.length) return;
  // Generate 1-3 new mock signals each cycle
  const count = 1 + Math.floor(Math.random()*3);
  for (let i=0;i<count;i++) {
    const d = D[Math.floor(Math.random()*D.length)];
    const isBuy = d.comp > 55 ? Math.random()>.3 : d.comp < 45 ? Math.random()>.7 : Math.random()>.5;
    const price = (20000 + Math.random()*80000).toFixed(d.s==='BTCUSDT'?0:d.s==='ETHUSDT'?0:4);
    const strength = Math.floor(60+Math.random()*40);
    sigHistory.unshift({
      s: d.s, buy: isBuy, price, strength,
      time: new Date().toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'UTC'})
    });
  }
  if (sigHistory.length>50) sigHistory.length=50;
  renderSignals();
}
function renderSignals() {
  const el=$('feed-signals'); if(!el) return;
  el.innerHTML = sigHistory.slice(0,25).map(s =>
    `<div class="sr"><span class="sr-tag ${s.buy?'sr-buy':'sr-sell'}">${s.buy?'BUY':'SELL'}</span><span class="sr-sym">${s.s.replace('USDT','')}</span><span class="sr-p">${s.strength}%</span><span class="sr-t">${s.time}</span></div>`
  ).join('');
}
let sigTimer;
function startSignals() {
  genSignals();
  sigTimer = setInterval(genSignals, 3000);
}

// ═══ THREE.JS ═══
function compC(v) {
  const t = Math.max(0,Math.min(100,v))/100;
  if (t<0.4) return new THREE.Color(0.96, 0.27+t*0.3, 0.15);
  if (t<0.6) return new THREE.Color(0.94, 0.73, 0.04);
  return new THREE.Color(0.05, 0.5+t*0.3, 0.5);
}
function basC(s) { return s==='CONTANGO'?0x0ecb81:s==='BACKWARDATION'?0xf6465d:0x5e6673; }

function initScene() {
  const w = $('canvas-wrap'), cv = $('cv');
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0e11, 0.01);
  clk = new THREE.Clock(); ray = new THREE.Raycaster(); mouse = new THREE.Vector2(-9,-9);

  cam = new THREE.PerspectiveCamera(55, w.clientWidth/w.clientHeight, 0.1, 300);
  cam.position.set(8, 1.5, 8);

  ren = new THREE.WebGLRenderer({canvas:cv, antialias:true});
  ren.setSize(w.clientWidth, w.clientHeight);
  ren.setPixelRatio(Math.min(devicePixelRatio, 2));
  ren.setClearColor(0x0b0e11);

  ctrl = new OrbitControls(cam, cv);
  ctrl.enableDamping = true; ctrl.dampingFactor = 0.05;
  ctrl.autoRotate = true; ctrl.autoRotateSpeed = 0.35;
  ctrl.minDistance = 4; ctrl.maxDistance = 35;

  scene.add(new THREE.AmbientLight(0x404050, 0.4));
  const l1 = new THREE.PointLight(0xf0b90b, 1.5, 60); l1.position.set(12,15,12); scene.add(l1);
  const l2 = new THREE.PointLight(0x0ecb81, 1.0, 60); l2.position.set(-12,-10,-12); scene.add(l2);
  const l3 = new THREE.PointLight(0xf6465d, 0.7, 50); l3.position.set(8,-12,8); scene.add(l3);

  mkStars(); mkGrid(); mkStreamPts();

  cv.addEventListener('mousemove', onMM);
  cv.addEventListener('click', onCl);
  addEventListener('resize', onRS);
}

function mkStars() {
  const n=4000, g=new THREE.BufferGeometry(), p=new Float32Array(n*3), c=new Float32Array(n*3);
  for (let i=0;i<n;i++) {
    p[i*3]=(Math.random()-.5)*160; p[i*3+1]=(Math.random()-.5)*160; p[i*3+2]=(Math.random()-.5)*160;
    const b=Math.random(); c[i*3]=.5+b*.2; c[i*3+1]=.55+b*.15; c[i*3+2]=.6+b*.2;
  }
  g.setAttribute('position', new THREE.BufferAttribute(p,3));
  g.setAttribute('color', new THREE.BufferAttribute(c,3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({size:.06, vertexColors:true, transparent:true, opacity:.45, sizeAttenuation:true})));
}

function mkGrid() {
  for (let r=5;r<=25;r+=5) {
    const pts=[];
    for (let a=0;a<=64;a++) { const an=(a/64)*Math.PI*2; pts.push(new THREE.Vector3(r*Math.cos(an),-7,r*Math.sin(an))); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color:0x2b3139,transparent:true,opacity:.2})));
  }
  for (let a=0;a<12;a++) {
    const an=(a/12)*Math.PI*2;
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-7,0),new THREE.Vector3(25*Math.cos(an),-7,25*Math.sin(an))]),new THREE.LineBasicMaterial({color:0x1e2329,transparent:true,opacity:.15})));
  }
}

// Data stream particles that fly toward helix
let stPts;
function mkStreamPts() {
  const n=800, g=new THREE.BufferGeometry();
  const p=new Float32Array(n*3), c=new Float32Array(n*3), v=new Float32Array(n);
  for (let i=0;i<n;i++) {
    const a=Math.random()*Math.PI*2, d=10+Math.random()*20;
    p[i*3]=d*Math.cos(a); p[i*3+1]=(Math.random()-.5)*14; p[i*3+2]=d*Math.sin(a);
    v[i]=.015+Math.random()*.04;
    const t=Math.random();
    if (t<.3) {c[i*3]=.94;c[i*3+1]=.73;c[i*3+2]=.04;}
    else if (t<.6) {c[i*3]=.05;c[i*3+1]=.8;c[i*3+2]=.5;}
    else {c[i*3]=.96;c[i*3+1]=.27;c[i*3+2]=.36;}
  }
  g.setAttribute('position',new THREE.BufferAttribute(p,3));
  g.setAttribute('color',new THREE.BufferAttribute(c,3));
  g.userData={v};
  stPts = new THREE.Points(g, new THREE.PointsMaterial({size:.045,vertexColors:true,transparent:true,opacity:.65,sizeAttenuation:true}));
  scene.add(stPts);
}

// ═══ BUILD HELIX ═══
function build() {
  for (const m of [...nds,...rng,...glo,...lbl,...bra]) scene.remove(m);
  if (bbL) scene.remove(bbL); if (bbR) scene.remove(bbR);
  nds=[]; rng=[]; glo=[]; lbl=[]; bra=[];
  if (!D.length) return;

  const n=D.length, lP=[], rP=[], oY=(n-1)*SP/2;

  for (let i=0;i<n;i++) {
    const d=D[i], y=i*SP-oY, a=i*TW*Math.PI*2;
    const lx=R*Math.cos(a), lz=R*Math.sin(a);
    const rx=R*Math.cos(a+Math.PI), rz=R*Math.sin(a+Math.PI);
    lP.push(new THREE.Vector3(lx,y,lz));
    rP.push(new THREE.Vector3(rx,y,rz));

    // main node
    const ns=.14+d.sig*.30, nc=compC(d.comp);
    const nm=new THREE.Mesh(new THREE.SphereGeometry(ns,16,16),
      new THREE.MeshPhongMaterial({color:nc,emissive:nc.clone().multiplyScalar(.2),shininess:80,transparent:true,opacity:.92}));
    nm.position.set(lx,y,lz); nm.userData={i,s:d.s};
    scene.add(nm); nds.push(nm);

    // bear node
    const bs=.06+(1-d.sig)*.06, bc=new THREE.Color(.96,.27,.36);
    const bm=new THREE.Mesh(new THREE.SphereGeometry(bs,8,8),
      new THREE.MeshPhongMaterial({color:bc,emissive:bc.clone().multiplyScalar(.1),transparent:true,opacity:.6}));
    bm.position.set(rx,y,rz); scene.add(bm); rng.push(bm);

    // rung
    const rl=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(lx,y,lz),new THREE.Vector3(rx,y,rz)]),
      new THREE.LineBasicMaterial({color:basC(d.bs),transparent:true,opacity:.2+d.ten*.5}));
    scene.add(rl); rng.push(rl);

    // glow
    if (d.glow) {
      const gm=new THREE.Mesh(new THREE.SphereGeometry(ns*3,10,10),
        new THREE.MeshBasicMaterial({color:d.reg==='VOLATILE_BREAKOUT'?0xf6465d:0xf0b90b,transparent:true,opacity:.07}));
      gm.position.copy(nm.position); gm.userData={gi:i};
      scene.add(gm); glo.push(gm);
    }

    // ── BRANCHES: RSI, MACD, OI, Funding ──
    if (d.sig >= 0.25) {
      // RSI branch
      mkBranch(nm.position, a+Math.PI*0.35, .5+d.rsi/120, y+.12, d.rsi>70?0xf6465d:d.rsi<30?0x0ecb81:0xf0b90b, .45);
      // MACD branch
      mkBranch(nm.position, a-Math.PI*0.35, .3+Math.abs(d.macd)*3, y-.08, d.macd>=0?0x0ecb81:0xf6465d, .35);
      // OI branch
      if (Math.abs(d.oi) > 2)
        mkBranch(nm.position, a+Math.PI*0.7, .25+Math.abs(d.oi)/20, y-.15, d.oi>=0?0x0ecb81:0xf6465d, .3);
      // Funding branch
      if (Math.abs(d.fr) > 0.008)
        mkBranch(nm.position, a-Math.PI*0.7, .2+Math.abs(d.fr)*6, y+.05, d.fr<0?0x0ecb81:0xf6465d, .35);
    }

    // label
    if (d.sig >= 0.35) {
      const sp=mkLbl(d.s.replace('USDT',''));
      sp.position.set(lx+(lx>0?.6:-.6), y+.28, lz);
      sp.scale.set(1.2,.3,1);
      scene.add(sp); lbl.push(sp);
    }
  }

  bbL = mkTube(lP, 0x0ecb81, .05); bbR = mkTube(rP, 0xf6465d, .05);
  scene.add(bbL); scene.add(bbR);

  // inner helix (accent)
  const iR=R*.4, iLP=[], iRP=[];
  for (let i=0;i<n;i++) {
    const y=i*SP-oY, a=i*TW*Math.PI*2+Math.PI*.5;
    iLP.push(new THREE.Vector3(iR*Math.cos(a),y,iR*Math.sin(a)));
    iRP.push(new THREE.Vector3(iR*Math.cos(a+Math.PI),y,iR*Math.sin(a+Math.PI)));
  }
  const il=mkTube(iLP,0xf0b90b,.02,.25), ir=mkTube(iRP,0x848e9c,.02,.2);
  scene.add(il); scene.add(ir); bra.push(il,ir);

  // outer helix (structural)
  const oR=R*1.6, oLP=[], oRP=[];
  for (let i=0;i<n;i++) {
    const y=i*SP-oY, a=i*TW*.5*Math.PI*2;
    oLP.push(new THREE.Vector3(oR*Math.cos(a),y,oR*Math.sin(a)));
    oRP.push(new THREE.Vector3(oR*Math.cos(a+Math.PI),y,oR*Math.sin(a+Math.PI)));
  }
  const ol=mkTube(oLP,0x2b3139,.008,.12), or2=mkTube(oRP,0x2b3139,.008,.12);
  scene.add(ol); scene.add(or2); bra.push(ol,or2);

  ctrl.target.set(0,0,0);
}

function mkBranch(origin, angle, len, y, color, opacity) {
  const end = new THREE.Vector3(
    origin.x + len*Math.cos(angle), y,
    origin.z + len*Math.sin(angle)
  );
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([origin.clone(), end]),
    new THREE.LineBasicMaterial({color, transparent:true, opacity})
  );
  scene.add(line); bra.push(line);
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(.03,6,6),
    new THREE.MeshBasicMaterial({color, transparent:true, opacity: opacity+.15})
  );
  tip.position.copy(end);
  scene.add(tip); bra.push(tip);
}

function mkTube(pts, color, radius, opacity) {
  if (pts.length<2) return new THREE.Group();
  return new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,false,'catmullrom',.5), pts.length*8, radius||.03, 8, false),
    new THREE.MeshPhongMaterial({color, emissive:new THREE.Color(color).multiplyScalar(.1), transparent:true, opacity:opacity||.6, shininess:50})
  );
}

function mkLbl(text) {
  const cv=document.createElement('canvas'); cv.width=128; cv.height=32;
  const ctx=cv.getContext('2d'); ctx.font='bold 16px monospace'; ctx.fillStyle='#eaecef'; ctx.textAlign='center'; ctx.fillText(text,64,20);
  const tex=new THREE.CanvasTexture(cv); tex.minFilter=THREE.LinearFilter;
  return new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,opacity:.6}));
}

// ═══ ANIMATE ═══
function animate() {
  requestAnimationFrame(animate);
  const t = clk.getElapsedTime();
  ctrl.autoRotateSpeed = .3 + avgATR*.1;
  ctrl.update();

  for (const g of glo) {
    g.material.opacity = .05+Math.sin(t*3+g.userData.gi)*.04;
    g.scale.setScalar(1+Math.sin(t*2+g.userData.gi*.7)*.1);
  }

  // stream particles fly toward center
  if (stPts) {
    const p = stPts.geometry.attributes.position;
    const v = stPts.geometry.userData.v;
    for (let i=0;i<p.count;i++) {
      let x=p.getX(i), z=p.getZ(i);
      const d=Math.sqrt(x*x+z*z);
      if (d>.3) {
        p.setX(i, x - x/d*v[i]);
        p.setZ(i, z - z/d*v[i]);
        p.setY(i, p.getY(i)+Math.sin(t+i)*.002);
      } else {
        const a=Math.random()*Math.PI*2, dd=12+Math.random()*18;
        p.setX(i, dd*Math.cos(a));
        p.setZ(i, dd*Math.sin(a));
        p.setY(i, (Math.random()-.5)*D.length*SP*2);
      }
    }
    p.needsUpdate=true;
  }

  // hover
  ray.setFromCamera(mouse, cam);
  const hits = ray.intersectObjects(nds);
  if (hits.length) {
    const h=hits[0].object;
    if (hov!==h) { if(hov) hov.scale.setScalar(1); hov=h; hov.scale.setScalar(1.35); showTip(h); }
  } else if (hov) { hov.scale.setScalar(1); hov=null; hideTip(); }

  ren.render(scene, cam);
}

// ═══ INTERACTION ═══
function onMM(e) {
  const r=ren.domElement.getBoundingClientRect();
  mouse.x=((e.clientX-r.left)/r.width)*2-1;
  mouse.y=-((e.clientY-r.top)/r.height)*2+1;
  const tt=$('tip');
  if (!tt.classList.contains('hidden')) {
    tt.style.left=Math.min(e.clientX-r.left+16,r.width-220)+'px';
    tt.style.top=(e.clientY-r.top-10)+'px';
  }
}
function onCl() { if(hov) showDet(D[hov.userData.i]); }

function showTip(mesh) {
  const d=D[mesh.userData.i];
  $('tip').innerHTML=`<div class="tip-s">${d.s.replace('USDT','')}/USDT</div>
<div class="tip-r"><span class="tip-k">COMPOSITE</span><span class="tip-v ${d.comp>=60?'up':d.comp<=40?'dn':''}">${d.comp.toFixed(1)}</span></div>
<div class="tip-r"><span class="tip-k">BIAS</span><span class="tip-v ${d.bias==='BULLISH'?'up':'dn'}">${d.bias}</span></div>
<div class="tip-r"><span class="tip-k">RSI</span><span class="tip-v ${d.rsi>70?'dn':d.rsi<30?'up':''}">${d.rsi.toFixed(1)}</span></div>
<div class="tip-r"><span class="tip-k">MACD</span><span class="tip-v ${d.macd>=0?'up':'dn'}">${d.macd>=0?'+':''}${d.macd.toFixed(3)}</span></div>
<div class="tip-r"><span class="tip-k">FUNDING</span><span class="tip-v ${d.fr<0?'up':'dn'}">${(d.fr*100).toFixed(4)}%</span></div>
<div class="tip-r"><span class="tip-k">REGIME</span><span class="tip-v">${d.reg.replace('_',' ')}</span></div>`;
  $('tip').classList.remove('hidden');
}
function hideTip() { $('tip').classList.add('hidden'); }

// ═══ DETAIL PANEL ═══
function showDet(d) {
  sel = d.s;
  $('det-title').textContent = d.s.replace('USDT','')+'/USDT';
  const B = (v,mx,c) => `<div class="bar-lg"><div class="bar-f" style="width:${Math.min(100,v/mx*100)}%;background:var(${c})"></div></div>`;
  $('det-body').innerHTML = `
<div class="det-s"><div class="det-st">Smart Money Radar</div>
<div class="det-r"><span class="l">Composite</span><span class="v ${d.comp>=60?'up':d.comp<=40?'dn':'warn'}">${d.comp.toFixed(1)}/100</span></div>
${B(d.comp,100,d.comp>=60?'--up':d.comp<=40?'--dn':'--acc')}
<div class="det-r"><span class="l">Bias</span><span class="v ${d.bias==='BULLISH'?'up':'dn'}">${d.bias}</span></div>
${Object.entries(d.fac).map(([k,v])=>`<div class="det-r"><span class="l">${k.replace(/_/g,' ')}</span><span class="v">${typeof v==='number'?v.toFixed(3):v}</span></div>`).join('')}</div>
<div class="det-s"><div class="det-st">RSI / MACD</div>
<div class="det-r"><span class="l">RSI</span><span class="v ${d.rsi>70?'dn':d.rsi<30?'up':''}">${d.rsi.toFixed(1)}</span></div>
${B(d.rsi,100,d.rsi>70?'--dn':d.rsi<30?'--up':'--acc')}
<div class="det-r"><span class="l">MACD</span><span class="v ${d.macd>=0?'up':'dn'}">${d.macd>=0?'+':''}${d.macd.toFixed(3)}</span></div>
<div class="det-r"><span class="l">OI Change</span><span class="v ${d.oi>=0?'up':'dn'}">${d.oi.toFixed(1)}%</span></div></div>
<div class="det-s"><div class="det-st">Funding Rate</div>
<div class="det-r"><span class="l">Rate</span><span class="v ${d.fr<0?'up':'dn'}">${(d.fr*100).toFixed(4)}%</span></div>
<div class="det-r"><span class="l">Direction</span><span class="v">${d.fdir}</span></div>
${d.apr?`<div class="det-r"><span class="l">Annual APR</span><span class="v ${d.apr<0?'up':'dn'}">${d.apr.toFixed(1)}%</span></div>`:''}</div>
<div class="det-s"><div class="det-st">Market Regime</div>
<div class="det-r"><span class="l">Regime</span><span class="v">${d.reg.replace('_',' ')}</span></div>
<div class="det-r"><span class="l">ATR %</span><span class="v">${d.atr.toFixed(3)}%</span></div>
<div class="det-r"><span class="l">ADX</span><span class="v">${d.adx.toFixed(1)}</span></div>
<div class="det-r"><span class="l">Vol Change</span><span class="v ${d.volc>=0?'up':'dn'}">${d.volc.toFixed(1)}%</span></div></div>
<div class="det-s"><div class="det-st">Basis Spread</div>
<div class="det-r"><span class="l">State</span><span class="v ${d.bs==='CONTANGO'?'up':d.bs==='BACKWARDATION'?'dn':''}">${d.bs}</span></div>
<div class="det-r"><span class="l">Basis %</span><span class="v ${d.bp>=0?'up':'dn'}">${d.bp.toFixed(4)}%</span></div></div>
<div class="det-s"><div class="det-st">Accumulation</div>
<div class="det-r"><span class="l">Composite</span><span class="v">${d.ac.toFixed(1)}/100</span></div>
${B(d.ac,100,d.ac>=70?'--up':d.ac>=40?'--acc':'--dn')}
<div class="det-r"><span class="l">Signal</span><span class="v ${d.as==='STRONG'?'up':''}">${d.as}</span></div>
${Object.entries(d.asc).map(([k,v])=>`<div class="det-r"><span class="l">${k.replace(/_/g,' ')}</span><span class="v">${typeof v==='number'?v.toFixed(1):v}</span></div>`).join('')}</div>
<div class="det-s"><div class="det-st">DNA Forces</div>
<div class="det-r"><span class="l">Bull Force</span><span class="v up">${d.bull.toFixed(3)}</span></div>
${B(d.bull,1,'--up')}
<div class="det-r"><span class="l">Bear Force</span><span class="v dn">${d.bear.toFixed(3)}</span></div>
${B(d.bear,1,'--dn')}
<div class="det-r"><span class="l">Tension</span><span class="v warn">${d.ten.toFixed(3)}</span></div>
<div class="det-r"><span class="l">Significance</span><span class="v">${(d.sig*100).toFixed(0)}%</span></div></div>`;
  $('detail').classList.add('open');
}

function hideDet() { $('detail').classList.remove('open'); sel=null; }

// ═══ MOBILE ═══
function renderMob() {
  const el=$('mob');
  el.innerHTML = `
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:40px 24px;text-align:center">
  <svg width="48" height="48" viewBox="0 0 126.61 126.61" style="opacity:.4;margin-bottom:20px"><g fill="#f0b90b"><polygon points="38.73,53.2 63.3,28.63 87.88,53.21 102.13,38.96 63.3,0.14 24.48,38.96"/><polygon points="0.14,63.31 14.39,49.06 28.63,63.31 14.39,77.55"/><polygon points="38.73,73.41 63.3,97.98 87.88,73.4 102.14,87.64 102.13,87.66 63.3,126.48 24.48,87.66 24.46,87.64"/><polygon points="97.98,63.31 112.23,49.07 126.47,63.31 112.23,77.56"/><polygon points="77.83,63.3 63.3,48.78 52.94,59.14 51.79,60.29 48.78,63.3 63.3,77.83 77.84,63.31 77.83,63.3"/></g></svg>
  <div style="font-size:16px;font-weight:700;color:var(--acc);margin-bottom:8px;letter-spacing:1px">DESKTOP ONLY</div>
  <div style="font-size:12px;color:var(--txm);line-height:1.6;max-width:280px">Market DNA 3D visualization requires a desktop browser. Please open this page on a computer for the full experience.</div>
  <a href="/superbsc/" style="margin-top:24px;font-size:11px;padding:8px 20px;border:1px solid var(--acc);color:var(--acc);text-decoration:none;border-radius:4px;font-weight:600;font-family:var(--f)">Back to Terminal</a>
</div>`;
}

// ═══ RESIZE ═══
function onRS() {
  if (mob()) {
    $('canvas-wrap').style.display='none';
    if ($('sp-left')) $('sp-left').style.display='none';
    if ($('sp-right')) $('sp-right').style.display='none';
    $('mob').classList.remove('hidden'); $('mob').style.display='block';
    renderMob();
  } else {
    $('canvas-wrap').style.display='block';
    if ($('sp-left')) $('sp-left').style.display='flex';
    if ($('sp-right')) $('sp-right').style.display='flex';
    $('mob').style.display='none';
    if (ren) {
      const w=$('canvas-wrap');
      cam.aspect=w.clientWidth/w.clientHeight;
      cam.updateProjectionMatrix();
      ren.setSize(w.clientWidth,w.clientHeight);
    }
  }
}

// ═══ INIT ═══
async function init() {
  $('det-close').onclick = hideDet;
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') hideDet(); });

  await load();

  const ldr=$('loader'); if(ldr) ldr.remove();

  if (mob()) {
    $('canvas-wrap').style.display='none';
    if ($('sp-left')) $('sp-left').style.display='none';
    if ($('sp-right')) $('sp-right').style.display='none';
    $('mob').classList.remove('hidden'); $('mob').style.display='block';
    renderMob();
  } else {
    initScene(); build(); animate();
    startDataFly();
    startSignals();
  }

  setInterval(async()=>{
    await load();
    if (mob()) renderMob(); else build();
    if (sel) { const d=D.find(x=>x.s===sel); if(d)showDet(d); }
  }, 30000);
}

init();
