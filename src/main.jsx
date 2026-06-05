import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import './style.css';

import ipLogo from './main/assets/ip_logo.png';
import rjpIcon from './main/assets/rjp_icon.png';

function App(){
  const [registos,setRegistos]=useState(JSON.parse(localStorage.getItem('fencerail_registos')||'[]'));

  const [form,setForm]=useState({
    linha:'',
    troco:'',
    pkInicio:'',
    pkFim:'',
    lado:'Direito',
    zona:'Rural',
    tipo:'Vedação Plena Via Zona Rural',
    estado:'Bom',
    obs:'',
    acao:'',
    gpsInicio:'',
    gpsFim:''
  });

  const guardar=(lista)=>{
    setRegistos(lista);
    localStorage.setItem('fencerail_registos',JSON.stringify(lista));
  };

  const getGps=async(campo)=>{
    try{
      const p=await new Promise((res,rej)=>
        navigator.geolocation.getCurrentPosition(
          res,
          rej,
          {enableHighAccuracy:true,timeout:15000,maximumAge:0}
        )
      );

      setForm({
        ...form,
        [campo]:`${p.coords.latitude.toFixed(7)}, ${p.coords.longitude.toFixed(7)}`
      });

    }catch(e){
      alert('Não foi possível obter GPS. Ativa a localização e dá permissão à app.');
    }
  };

  const adicionar=()=>{
    guardar([
      {...form,id:Date.now(),data:new Date().toLocaleString('pt-PT')},
      ...registos
    ]);

    setForm({
      ...form,
      pkInicio:'',
      pkFim:'',
      obs:'',
      acao:'',
      gpsInicio:'',
      gpsFim:''
    });
  };

  const exportarExcel=()=>{
    const ws=XLSX.utils.json_to_sheet(registos);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Cadastro');
    XLSX.writeFile(wb,'FenceRail_RJP_cadastro.xlsx');
  };

  const exportarPDF=()=>{
    const pdf=new jsPDF();

    pdf.setFontSize(18);
    pdf.text('FenceRail_RJP - Cadastro de Vedações',14,18);

    pdf.setFontSize(10);

    let y=32;

    registos.forEach((r,i)=>{
      if(y>270){
        pdf.addPage();
        y=20;
      }

      pdf.text(`${i+1}. ${r.linha} | ${r.pkInicio}-${r.pkFim} | ${r.lado} | ${r.tipo} | ${r.estado}`,14,y);
      y+=6;

      pdf.text(`GPS: ${r.gpsInicio || '-'} -> ${r.gpsFim || '-'}`,14,y);
      y+=6;

      pdf.text(`Obs: ${r.obs || '-'}`,14,y);
      y+=6;

      pdf.text(`Ação: ${r.acao || '-'}`,14,y);
      y+=9;
    });

    pdf.save('FenceRail_RJP_relatorio.pdf');
  };

  const stats=useMemo(
    ()=>registos.reduce((a,r)=>{
      a[r.estado]=(a[r.estado]||0)+1;
      return a;
    },{}),
    [registos]
  );

  return (
    <div className="app">

      <header className="topo">
        <div className="topo-flex">
          <img className="logo" src={ipLogo} alt="Infraestruturas de Portugal" />

          <div>
            <h1>INSPEÇÃO DE VEDAÇÕES</h1>
            <p>Manutenção Ferroviária</p>
            <p>Autor: <b>RJP</b></p>
          </div>
        </div>
      </header>

      <main>

        <section className="card center">
          <img className="logo-central" src={rjpIcon} alt="RJP" />

          <h2>Inspeção de Vedações</h2>
          <p>Inspeção e Cadastro de Vedações</p>
        </section>

        <section className="card">
          <h2>Dados da Vedação</h2>

          <div className="grid">

            <input
              placeholder="Linha"
              value={form.linha}
              onChange={e=>setForm({...form,linha:e.target.value})}
            />

            <input
              placeholder="Troço"
              value={form.troco}
              onChange={e=>setForm({...form,troco:e.target.value})}
            />

            <input
              placeholder="PK início"
              value={form.pkInicio}
              onChange={e=>setForm({...form,pkInicio:e.target.value})}
            />

            <input
              placeholder="PK fim"
              value={form.pkFim}
              onChange={e=>setForm({...form,pkFim:e.target.value})}
            />

            <select
              value={form.lado}
              onChange={e=>setForm({...form,lado:e.target.value})}
            >
              <option>Direito</option>
              <option>Esquerdo</option>
              <option>Ambos</option>
            </select>

            <select
              value={form.zona}
              onChange={e=>setForm({...form,zona:e.target.value})}
            >
              <option>Rural</option>
              <option>Urbana</option>
            </select>

            <select
              value={form.tipo}
              onChange={e=>setForm({...form,tipo:e.target.value})}
            >
              <option>Vedação Plena Via Zona Urbana</option>
              <option>Vedação Plena Via Zona Rural</option>
              <option>Rede Electrossoldada</option>
              <option>Painel de Rede Electrozincada</option>
              <option>Rede Simples Torção</option>
              <option>Muro em Betão</option>
              <option>Muro Betão Confinante</option>
              <option>Alvenaria Confinante</option>
              <option>Portão</option>
              <option>Outro</option>
            </select>

            <select
              value={form.estado}
              onChange={e=>setForm({...form,estado:e.target.value})}
            >
              <option>Bom</option>
              <option>Razoável</option>
              <option>Mau</option>
              <option>Crítico</option>
            </select>

          </div>

          <div className="gps">
            <button onClick={()=>getGps('gpsInicio')}>
              Marcar GPS início
            </button>

            <span>{form.gpsInicio || 'Sem GPS início'}</span>

            <button onClick={()=>getGps('gpsFim')}>
              Marcar GPS fim
            </button>

            <span>{form.gpsFim || 'Sem GPS fim'}</span>
          </div>

          <textarea
            placeholder="Observações"
            value={form.obs}
            onChange={e=>setForm({...form,obs:e.target.value})}
          />

          <textarea
            placeholder="Ação corretiva / manutenção recomendada"
            value={form.acao}
            onChange={e=>setForm({...form,acao:e.target.value})}
          />

          <button className="primary" onClick={adicionar}>
            Guardar registo
          </button>

        </section>

        <section className="card">
          <h2>Estatísticas</h2>

          <div className="chips">
            {Object.entries(stats).map(([k,v])=>
              <span key={k}>{k}: {v}</span>
            )}
          </div>

          <button onClick={exportarExcel}>
            Exportar Excel
          </button>

          <button onClick={exportarPDF}>
            Exportar PDF
          </button>
        </section>

        <section className="card">
          <h2>Registos</h2>

          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Tipo</th>
                <th>Obs.</th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              {registos.map(r=>
                <tr key={r.id}>
                  <td>{r.estado}</td>
                  <td>
                    {r.tipo}
                    <br/>
                    <small>{r.linha} {r.pkInicio}-{r.pkFim}</small>
                  </td>
                  <td>{r.obs}</td>
                  <td>{r.acao}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App/>);
