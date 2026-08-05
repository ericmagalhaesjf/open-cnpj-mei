// script.js — lê dados-juiz-de-fora.json e filtra MEIs
const form = document.getElementById('formPesquisa');
const resultadoDiv = document.getElementById('resultado');
const statusEl = document.getElementById('status');
const graficoEl = document.getElementById('grafico');
const btnExport = document.getElementById('btnExport');

let lastResults = [];

async function carregarDadosLocal() {
  // tenta carregar o subconjunto gerado pelo workflow
  try {
    const r = await fetch('dados-juiz-de-fora.json', {cache: "no-store"});
    if (!r.ok) throw new Error('Arquivo de dados não encontrado');
    const json = await r.json();
    return json;
  } catch (err) {
    console.warn('Falha ao carregar dados-juiz-de-fora.json:', err.message);
    // fallback para dados-sample.json (pequeno)
    try {
      const r2 = await fetch('dados-sample.json', {cache: "no-store"});
      if (!r2.ok) throw new Error('dados-sample.json não encontrado');
      return await r2.json();
    } catch (err2) {
      throw new Error('Nenhum arquivo de dados disponível');
    }
  }
}

function formatEndereco(emp) {
  const parts = [];
  if (emp.logradouro) parts.push(emp.logradouro);
  if (emp.numero) parts.push(emp.numero);
  if (emp.bairro) parts.push(emp.bairro);
  if (emp.municipio) parts.push(emp.municipio);
  if (emp.uf) parts.push(emp.uf);
  return parts.join(' • ');
}

function exportCSV(rows) {
  if (!rows || rows.length === 0) return;
  const headers = ['razao_social','cnpj','cnae','situacao_cadastral','endereco'];
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${(r[h]||'').toString().replace(/"/g,'""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mei-juiz-de-fora.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderResults(empresas) {
  resultadoDiv.innerHTML = '';
  empresas.forEach(emp => {
    const div = document.createElement('div');
    div.className = 'empresa';
    div.innerHTML = `
      <strong>${emp.razao_social || emp.nome}</strong><br>
      📌 <strong>CNPJ:</strong> ${emp.cnpj} • 🏢 <strong>CNAE:</strong> ${emp.cnae || ''}<br>
      ✅ <strong>Situação:</strong> ${emp.situacao_cadastral || emp.situacao} • 📍 ${formatEndereco(emp)}
    `;
    resultadoDiv.appendChild(div);
  });
}

function buildChart(empresas) {
  const counts = {};
  empresas.forEach(e => {
    const key = e.cnae || 'N/A';
    counts[key] = (counts[key] || 0) + 1;
  });
  const labels = Object.keys(counts).slice(0, 20);
  const data = labels.map(l => counts[l]);
  if (window._chart) window._chart.destroy();
  const ctx = graficoEl.getContext('2d');
  window._chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'MEIs', data, backgroundColor: 'rgba(0,74,173,0.8)' }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  statusEl.textContent = 'Carregando dados...';
  resultadoDiv.innerHTML = '';
  try {
    const cidade = document.getElementById('cidade').value.trim();
    const estado = document.getElementById('estado').value.trim().toUpperCase();
    const cnae = document.getElementById('cnae').value.trim();

    const dados = await carregarDadosLocal(); // array de objetos
    // normalizar: cada item deve ter campos: cnpj, razao_social, cnae, municipio, uf, simples.mei, natureza_juridica, situacao_cadastral, endereco
    const empresas = dados.filter(emp => {
      const isCidade = (emp.municipio || '').toLowerCase() === cidade.toLowerCase();
      const isUF = (emp.uf || '').toUpperCase() === estado.toUpperCase();
      const isMEI = (emp.simples && emp.simples.mei === true) || (emp.natureza_juridica === '213-5');
      const isCNAE = !cnae || (emp.cnae || '').startsWith(cnae);
      return isCidade && isUF && isMEI && isCNAE;
    });

    lastResults = empresas.map(e => ({
      razao_social: e.razao_social || e.nome,
      cnpj: e.cnpj,
      cnae: e.cnae || '',
      situacao_cadastral: e.situacao_cadastral || e.situacao || '',
      endereco: formatEndereco(e)
    }));

    if (lastResults.length === 0) {
      statusEl.textContent = 'Nenhum MEI encontrado.';
      resultadoDiv.innerHTML = '';
      if (window._chart) window._chart.destroy();
      return;
    }

    statusEl.textContent = `${lastResults.length} MEI(s) encontrados.`;
    renderResults(lastResults);
    buildChart(lastResults);
  } catch (err) {
    statusEl.textContent = 'Erro: ' + err.message;
    console.error(err);
  }
});

btnExport.addEventListener('click', () => {
  exportCSV(lastResults);
});
