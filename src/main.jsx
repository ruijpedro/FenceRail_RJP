import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import './style.css';

import ipLogo from './main/assets/ip_logo.png';

const SCRIPT_URL = localStorage.getItem('vedacoes_script_url') || '';

const vazio = {
  linha:'Linha do Oeste', troco:'', pkInicio:'', pkFim:'', lado:'Direito',
  tipoNorma:'Vedação Plena Via Zona Rural', tipologia:'Rede Electrossoldada',
  estado:'Bom', prioridade:'Normal', obs:'', acao:'',
  gpsInicio:'', gpsFim:'', gpsInicioData:'', gpsFimData:'', gpsInicioAcc:'', gpsFimAcc:'', comprimento:0,
  fotos:[]
};

function distMetros(a,b){
  if(!a || !b || !a.includes(',') || !b.includes(',')) return 0;
  const [lat1,lon1]=a.split(',').map(Number); const [lat2,lon2]=b.split(',').map(Number);
  const R=6371000, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  const s1=Math.sin(dLat/2), s2=Math.sin(dLon/2);
  const q=s1*s1+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*s2*s2;
  return Math.round(R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q)));
}

function App(){
  const [tab,setTab]=useState('dashboard');
  const [registos,setRegistos]=useState(JSON.parse(localStorage.getItem('vedacoes_registos')||'[]'));
  const [form,setForm]=useState(vazio);
  const [sync,setSync]=useState('Google Bridge pronto. Configure SCRIPT_URL no ficheiro Apps Script ou no localStorage.');

  const guardar=(lista)=>{ setRegistos(lista); localStorage.setItem('vedacoes_registos',JSON.stringify(lista)); };
  const setCampo=(k,v)=>setForm(f=>({...f,[k]:v}));

  async function marcarGps(prefixo){
    try{
      const p=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
      const gps=`${p.coords.latitude.toFixed(7)}, ${p.coords.longitude.toFixed(7)}`;
      setForm(f=>{
        const novo={...f,[`gps${prefixo}`]:gps,[`gps${prefixo}Data`]:new Date().toLocaleString('pt-PT'),[`gps${prefixo}Acc`]:Math.round(p.coords.accuracy)};
        novo.comprimento=distMetros(novo.gpsInicio,novo.gpsFim);
        return novo;
      });
    }catch(e){ alert('Não foi possível obter GPS. Ativa a localização e autoriza a app.'); }
  }

  function adicionarFoto(e){
    const ficheiros=[...e.target.files];
    const nomes=ficheiros.map(f=>({nome:f.name,data:new Date().toLocaleString('pt-PT'),gps:form.gpsInicio || form.gpsFim || ''}));
    setForm(f=>({...f,fotos:[...(f.fotos||[]),...nomes]}));
  }

  function guardarRegisto(){
    const reg={...form,id:`VED-${Date.now()}`,data:new Date().toLocaleString('pt-PT'),comprimento:distMetros(form.gpsInicio,form.gpsFim)};
    guardar([reg,...registos]);
    setForm({...vazio, linha:form.linha});
    setSync('Registo guardado localmente. Usa Sincronizar para enviar para Google Sheets/Drive.');
    setTab('registos');
  }

  async function sincronizar(){
    if(!SCRIPT_URL){ setSync('Falta configurar o SCRIPT_URL do Google Apps Script. Os dados ficam guardados localmente.'); return; }
    try{
      const payload={app:'Vedacoes',hub:'Hub_Manutencao_IP',registos};
      await fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      setSync('Sincronização enviada para Google Sheets/Drive.');
    }catch(e){ setSync('Erro de sincronização. Verifica ligação e URL do Apps Script.'); }
  }

  const atualizar=()=>{ const lista=JSON.parse(localStorage.getItem('vedacoes_registos')||'[]'); setRegistos(lista); setSync('Atualizado a partir do armazenamento local.'); };

  const exportarExcel=()=>{ const ws=XLSX.utils.json_to_sheet(registos.map(r=>({...r,fotos:(r.fotos||[]).map(f=>f.nome).join('; ')}))); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Vedacoes'); XLSX.writeFile(wb,'Vedacoes_Hub_Manutencao_IP.xlsx'); };

  const exportarPDF=()=>{ const pdf=new jsPDF(); pdf.setFontSize(18); pdf.text('Vedações - Hub Manutenção IP',14,18); pdf.setFontSize(10); let y=32; registos.forEach((r,i)=>{ if(y>270){pdf.addPage();y=20;} pdf.text(`${i+1}. ${r.linha} | ${r.troco} | PK ${r.pkInicio}-${r.pkFim} | ${r.lado} | ${r.estado}`,14,y); y+=6; pdf.text(`GPS início: ${r.gpsInicio||'-'} | GPS fim: ${r.gpsFim||'-'} | ${r.comprimento||0} m`,14,y); y+=6; pdf.text(`Obs: ${r.obs||'-'}`,14,y); y+=6; pdf.text(`Ação: ${r.acao||'-'}`,14,y); y+=9; }); pdf.save('Vedacoes_Relatorio_IP.pdf'); };

  const stats=useMemo(()=>({
    total:registos.length,
    metros:registos.reduce((a,r)=>a+(Number(r.comprimento)||0),0),
    nc:registos.filter(r=>['Mau','Crítico'].includes(r.estado)).length,
    fotos:registos.reduce((a,r)=>a+(r.fotos?.length||0),0)
  }),[registos]);

  return <div className="app">
    <header className="hero-ip">
      <img src={ipLogo} alt="Infraestruturas de Portugal" />
      <div><h1>Vedações</h1><p>Cadastro, inspeção e levantamento GPS de vedações ferroviárias</p><b>Hub Manutenção IP · Autor RJP · Google Bridge</b></div>
    </header>

    <nav className="tabs">
      {['dashboard','google','gps','registos','mapa','drive','calendar','pdf'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{({dashboard:'Dashboard',google:'Google Bridge',gps:'Levantamento GPS',registos:'Vedações',mapa:'Mapa',drive:'Drive',calendar:'Calendar',pdf:'PDF'})[t]}</button>)}
    </nav>

    {tab==='dashboard'&&<section className="grid dash">
      <Card title="Troços inspecionados" value={stats.total}/><Card title="Metros levantados" value={`${stats.metros} m`}/><Card title="NC abertas" value={stats.nc}/><Card title="Fotos registadas" value={stats.fotos}/>
      <div className="card wide"><h2>Filosofia Hub Manutenção IP</h2><p>A app Vedações fica alinhada com EDF_Oeste, EBTCC, AMV e futuras apps de manutenção: visual verde IP, dados locais, Google Drive, Google Sheets, Google Calendar, PDF e botão Atualizar/Sincronizar.</p><button className="primary" onClick={()=>setTab('gps')}>Novo levantamento GPS</button></div>
    </section>}

    {tab==='google'&&<section className="card"><h2>Google Bridge</h2><p>Estrutura prevista na nuvem:</p><pre>Hub_Manutencao_IP/\n └─ Vedacoes/\n    ├─ Fotos\n    ├─ PDFs\n    ├─ Relatorios\n    ├─ Mapas\n    └─ Backup</pre><button className="primary" onClick={sincronizar}>☁️ Sincronizar com Google</button><button onClick={atualizar}>🔄 Atualizar Tudo</button><p className="note">{sync}</p></section>}

    {tab==='gps'&&<section className="card"><h2>Levantamento GPS do Troço</h2><div className="formgrid">
      <Field label="Linha"><input value={form.linha} onChange={e=>setCampo('linha',e.target.value)}/></Field>
      <Field label="Troço"><input value={form.troco} onChange={e=>setCampo('troco',e.target.value)} placeholder="Ex: Torres Vedras - Ramalhal"/></Field>
      <Field label="PK Inicial"><input value={form.pkInicio} onChange={e=>setCampo('pkInicio',e.target.value)} placeholder="Ex: 44+120"/></Field>
      <Field label="PK Final"><input value={form.pkFim} onChange={e=>setCampo('pkFim',e.target.value)} placeholder="Ex: 44+520"/></Field>
      <Field label="Lado"><select value={form.lado} onChange={e=>setCampo('lado',e.target.value)}><option>Direito</option><option>Esquerdo</option><option>Ambos</option></select></Field>
      <Field label="Tipo segundo Norma"><select value={form.tipoNorma} onChange={e=>setCampo('tipoNorma',e.target.value)}><option>Vedação Plena Via Zona Urbana</option><option>Vedação Plena Via Zona Rural</option><option>Vedação Estações/Apeadeiros</option><option>Outro / Cadastro Existente</option></select></Field>
      <Field label="Tipologia"><select value={form.tipologia} onChange={e=>setCampo('tipologia',e.target.value)}><option>Rede Electrossoldada</option><option>Muro em Betão</option><option>Alvenaria Confinante</option><option>Painel de Rede Electrozincada</option><option>Rede Simples Torção</option><option>Rural - Rede 160/9/15</option><option>Urbana - Tipologia I</option><option>Urbana - Tipologia II</option><option>Portão</option><option>Porta de Homem</option></select></Field>
      <Field label="Estado"><select value={form.estado} onChange={e=>setCampo('estado',e.target.value)}><option>Bom</option><option>Razoável</option><option>Mau</option><option>Crítico</option></select></Field>
    </div>
    <div className="gpsbox"><button onClick={()=>marcarGps('Inicio')}>📍 Marcar Início</button><span>{form.gpsInicio||'GPS inicial por marcar'}<small>{form.gpsInicioData} {form.gpsInicioAcc && `· precisão ${form.gpsInicioAcc} m`}</small></span><button onClick={()=>marcarGps('Fim')}>📍 Marcar Fim</button><span>{form.gpsFim||'GPS final por marcar'}<small>{form.gpsFimData} {form.gpsFimAcc && `· precisão ${form.gpsFimAcc} m`}</small></span></div>
    <div className="metric">Comprimento calculado: <b>{distMetros(form.gpsInicio,form.gpsFim)} m</b></div>
    <textarea placeholder="Observações / anomalias" value={form.obs} onChange={e=>setCampo('obs',e.target.value)} />
    <textarea placeholder="Ação corretiva / manutenção recomendada" value={form.acao} onChange={e=>setCampo('acao',e.target.value)} />
    <label className="upload">📷 Adicionar fotografias<input type="file" accept="image/*" multiple onChange={adicionarFoto}/></label><p className="note">Fotos selecionadas: {(form.fotos||[]).map(f=>f.nome).join(', ') || 'nenhuma'}</p>
    <button className="primary" onClick={guardarRegisto}>💾 Guardar registo</button><button onClick={sincronizar}>☁️ Sincronizar</button></section>}

    {tab==='registos'&&<section className="card"><h2>Registos de Vedações</h2><table><thead><tr><th>Data</th><th>Troço</th><th>Estado</th><th>GPS</th><th>Compr.</th></tr></thead><tbody>{registos.map(r=><tr key={r.id}><td>{r.data}</td><td><b>{r.linha}</b><br/>{r.troco}<br/>PK {r.pkInicio}-{r.pkFim}</td><td><span className={`estado ${r.estado}`}>{r.estado}</span></td><td>{r.gpsInicio}<br/>{r.gpsFim}</td><td>{r.comprimento||0} m</td></tr>)}</tbody></table></section>}

    {tab==='mapa'&&<section className="card"><h2>Mapa</h2><p>Abre o primeiro troço com GPS registado no Google Maps.</p><button onClick={()=>{const r=registos.find(x=>x.gpsInicio); if(r) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.gpsInicio)}`,'_blank')}}>🗺️ Abrir no Google Maps</button></section>}
    {tab==='drive'&&<section className="card"><h2>Google Drive</h2><p>Preparado para guardar PDFs, fotos, relatórios, mapas e backups na pasta Hub_Manutencao_IP/Vedacoes.</p><button className="primary" onClick={sincronizar}>Guardar na nuvem</button></section>}
    {tab==='calendar'&&<section className="card"><h2>Google Calendar</h2><p>Eventos previstos: Inspeção de Vedações, Reinspeção e Ação Corretiva.</p></section>}
    {tab==='pdf'&&<section className="card"><h2>PDF / Excel</h2><button className="primary" onClick={exportarPDF}>Gerar PDF</button><button onClick={exportarExcel}>Exportar Excel</button></section>}

    <footer>Vedações · Hub Manutenção IP · APK e WebApp preparadas para Google Drive/Sheets/Calendar</footer>
  </div>;
}
function Card({title,value}){return <div className="card stat"><span>{title}</span><b>{value}</b></div>}
function Field({label,children}){return <label><span>{label}</span>{children}</label>}

createRoot(document.getElementById('root')).render(<App/>);
