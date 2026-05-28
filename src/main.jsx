import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import './style.css'

const estadoOptions = ['Bom', 'Razoável', 'Mau', 'Crítico']
const tipoOptions = ['Rede metálica rural', 'Painel rígido urbano', 'Rede eletrossoldada', 'Muro', 'Portão', 'Barreira acústica', 'Vedação provisória', 'Outro']
const intervencaoOptions = ['Sem ação', 'Reparação', 'Substituição', 'Reforço', 'Limpeza', 'Controlo de vegetação', 'Nova vedação']
const prioridadeOptions = ['Baixa', 'Média', 'Alta', 'Urgente']

function nowISO() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function emptyForm() {
  return {
    id: crypto.randomUUID(),
    data: nowISO(),
    linha: '',
    troco: '',
    pkInicio: '',
    pkFim: '',
    lado: 'Direito',
    zona: 'Rural',
    estado: 'Bom',
    tipo: 'Rede metálica rural',
    obs: '',
    acao: 'Sem ação',
    prioridade: 'Baixa',
    gpsInicioLat: '',
    gpsInicioLon: '',
    gpsFimLat: '',
    gpsFimLon: '',
    comprimento: ''
  }
}

function loadRows() {
  try { return JSON.parse(localStorage.getItem('fencerail_rows') || '[]') } catch { return [] }
}

function saveRows(rows) {
  localStorage.setItem('fencerail_rows', JSON.stringify(rows))
}

function distanceMeters(aLat, aLon, bLat, bLon) {
  const R = 6371000
  const toRad = d => d * Math.PI / 180
  const p1 = toRad(Number(aLat)); const p2 = toRad(Number(bLat))
  const dp = toRad(Number(bLat) - Number(aLat))
  const dl = toRad(Number(bLon) - Number(aLon))
  const x = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x)))
}

function App() {
  const [form, setForm] = useState(emptyForm())
  const [rows, setRows] = useState(loadRows())
  const [msg, setMsg] = useState('')

  const stats = useMemo(() => ({
    total: rows.length,
    criticos: rows.filter(r => r.estado === 'Crítico').length,
    maus: rows.filter(r => r.estado === 'Mau').length,
    acoes: rows.filter(r => r.acao !== 'Sem ação').length
  }), [rows])

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function markGPS(prefix) {
    setMsg('A obter GPS...')
    if (!navigator.geolocation) {
      setMsg('GPS não disponível neste dispositivo/navegador.')
      return
    }
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude.toFixed(7)
      const lon = pos.coords.longitude.toFixed(7)
      setForm(f => {
        const nf = { ...f, [`${prefix}Lat`]: lat, [`${prefix}Lon`]: lon }
        if (nf.gpsInicioLat && nf.gpsFimLat) {
          nf.comprimento = distanceMeters(nf.gpsInicioLat, nf.gpsInicioLon, nf.gpsFimLat, nf.gpsFimLon)
        }
        return nf
      })
      setMsg(prefix === 'gpsInicio' ? 'Início GPS marcado.' : 'Fim GPS marcado.')
    }, () => setMsg('Não foi possível obter a localização GPS.'), { enableHighAccuracy: true, timeout: 15000 })
  }

  function addRow() {
    const row = { ...form, id: crypto.randomUUID(), data: nowISO() }
    const next = [row, ...rows]
    setRows(next); saveRows(next); setForm(emptyForm()); setMsg('Registo guardado no cadastro local.')
  }

  function clearRows() {
    if (!confirm('Apagar todos os registos locais?')) return
    setRows([]); saveRows([])
  }

  function exportXlsx() {
    const data = rows.map(r => ({
      Data: r.data,
      Linha: r.linha,
      Troço: r.troco,
      'PK Início': r.pkInicio,
      'PK Fim': r.pkFim,
      Lado: r.lado,
      Zona: r.zona,
      'GPS Início Lat': r.gpsInicioLat,
      'GPS Início Lon': r.gpsInicioLon,
      'GPS Fim Lat': r.gpsFimLat,
      'GPS Fim Lon': r.gpsFimLon,
      'Comprimento GPS (m)': r.comprimento,
      'Estado de Conservação': r.estado,
      Tipo: r.tipo,
      'Obs.': r.obs,
      'Ação de manutenção': r.acao,
      Prioridade: r.prioridade
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Cadastro')
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([out]), 'FenceRail_RJP_Cadastro.xlsx')
  }

  function exportPdf() {
    const doc = new jsPDF()
    doc.setFontSize(18); doc.text('FenceRail_RJP', 14, 18)
    doc.setFontSize(11); doc.text('Cadastro e inspeção de vedações ferroviárias', 14, 26)
    let y = 38
    rows.slice(0, 12).forEach((r, i) => {
      if (y > 270) { doc.addPage(); y = 18 }
      doc.setFontSize(12); doc.text(`${i+1}. ${r.linha || '-'} | PK ${r.pkInicio || '-'} a ${r.pkFim || '-'}`, 14, y)
      y += 7
      doc.setFontSize(9)
      const lines = [
        `Estado: ${r.estado} | Tipo: ${r.tipo} | Prioridade: ${r.prioridade}`,
        `GPS início: ${r.gpsInicioLat}, ${r.gpsInicioLon} | GPS fim: ${r.gpsFimLat}, ${r.gpsFimLon}`,
        `Ação de manutenção: ${r.acao}`,
        `Obs.: ${r.obs || '-'}`
      ]
      lines.forEach(t => { doc.text(t.substring(0, 105), 18, y); y += 5 })
      y += 4
    })
    doc.save('FenceRail_RJP_Relatorio.pdf')
  }

  return <div className="app">
    <header>
      <div>
        <h1>FenceRail_RJP</h1>
        <p>Levantamento, cadastro e inspeção de vedações em ambiente ferroviário</p>
      </div>
      <div className="badge">Offline local</div>
    </header>

    <section className="cards">
      <div><b>{stats.total}</b><span>Registos</span></div>
      <div><b>{stats.maus}</b><span>Mau</span></div>
      <div><b>{stats.criticos}</b><span>Crítico</span></div>
      <div><b>{stats.acoes}</b><span>Ações</span></div>
    </section>

    <main className="grid">
      <section className="panel">
        <h2>Novo cadastro por troço</h2>
        <div className="formGrid">
          <label>Linha<input value={form.linha} onChange={e=>setField('linha',e.target.value)} placeholder="Ex.: Linha do Oeste" /></label>
          <label>Troço<input value={form.troco} onChange={e=>setField('troco',e.target.value)} /></label>
          <label>PK Início<input value={form.pkInicio} onChange={e=>setField('pkInicio',e.target.value)} placeholder="Ex.: 121+450" /></label>
          <label>PK Fim<input value={form.pkFim} onChange={e=>setField('pkFim',e.target.value)} placeholder="Ex.: 121+510" /></label>
          <label>Lado<select value={form.lado} onChange={e=>setField('lado',e.target.value)}><option>Direito</option><option>Esquerdo</option><option>Ambos</option></select></label>
          <label>Zona<select value={form.zona} onChange={e=>setField('zona',e.target.value)}><option>Rural</option><option>Urbana</option></select></label>
          <label>Estado de Conservação<select value={form.estado} onChange={e=>setField('estado',e.target.value)}>{estadoOptions.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Tipo<select value={form.tipo} onChange={e=>setField('tipo',e.target.value)}>{tipoOptions.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Ação de manutenção<select value={form.acao} onChange={e=>setField('acao',e.target.value)}>{intervencaoOptions.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Prioridade<select value={form.prioridade} onChange={e=>setField('prioridade',e.target.value)}>{prioridadeOptions.map(x=><option key={x}>{x}</option>)}</select></label>
        </div>

        <div className="gpsBox">
          <button onClick={()=>markGPS('gpsInicio')}>Marcar início GPS</button>
          <button onClick={()=>markGPS('gpsFim')}>Marcar fim GPS</button>
          <span>Início: {form.gpsInicioLat || '-'}, {form.gpsInicioLon || '-'}</span>
          <span>Fim: {form.gpsFimLat || '-'}, {form.gpsFimLon || '-'}</span>
          <span>Comp.: {form.comprimento || '-'} m</span>
        </div>

        <label className="full">Observações<textarea value={form.obs} onChange={e=>setField('obs',e.target.value)} placeholder="Ex.: rede rasgada, poste inclinado, necessidade de reparação..." /></label>
        <div className="actions"><button className="primary" onClick={addRow}>Guardar registo</button><span>{msg}</span></div>
      </section>

      <section className="panel">
        <h2>Exportação</h2>
        <p>Gera um cadastro semelhante ao Excel, com GPS de início/fim, estado, tipo e observações.</p>
        <button onClick={exportXlsx}>Exportar Excel</button>
        <button onClick={exportPdf}>Exportar PDF</button>
        <button className="danger" onClick={clearRows}>Limpar dados locais</button>
      </section>
    </main>

    <section className="panel tablePanel">
      <h2>Cadastro</h2>
      <div className="tableWrap"><table><thead><tr><th>Estado de Conservação</th><th>Tipo</th><th>Obs.</th><th>PK</th><th>GPS</th><th>Ação</th></tr></thead><tbody>
        {rows.map(r => <tr key={r.id} className={`estado-${r.estado.toLowerCase().replace('í','i')}`}><td>{r.estado}</td><td>{r.tipo}</td><td>{r.obs}</td><td>{r.pkInicio} — {r.pkFim}</td><td>{r.gpsInicioLat},{r.gpsInicioLon}<br/>{r.gpsFimLat},{r.gpsFimLon}</td><td>{r.acao}<br/>{r.prioridade}</td></tr>)}
      </tbody></table></div>
    </section>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
