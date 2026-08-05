const form = document.getElementById('formPesquisa');
const resultadoDiv = document.getElementById('resultado');
const statusEl = document.getElementById('status');
const graficoEl = document.getElementById('grafico');
const btnExport = document.getElementById('btnExport');

let lastResults = [];

// Função para carregar dados locais
async function carregarDadosLocal() {
  try {
    const r = await fetch("dados-juiz-de-fora.json", { cache: "no-store" });
    if (!r.ok) throw new Error("dados-juiz-de-fora.json não encontrado");
    return await r.json();
  } catch (err) {
    console.warn("Fallback para dados-sample.json:", err.message);
    const r2 = await fetch("dados-sample.json", { cache: "no-store" });
    if (!r2.ok) throw new Error("dados-sample.json não encontrado");
    return await r2.json();
  }
}

// Monta endereço formatado
function formatEndereco(emp) {
  const parts = [];
  if (emp.logradouro) parts.push(emp.logradouro);
  if (emp.numero) parts.push(emp.numero);
  if (emp.bairro) parts.push(emp.bairro);
  if (emp.municipio) parts.push(emp.municipio);
  if (emp.uf) parts.push(emp.uf);
  return parts.join(" • ");
}

// Exporta resultados para CSV
function exportCSV(rows) {
  if (!rows || rows.length === 0) return;
  const headers = ["razao_social","cnpj","cnae","situacao_cadastral","endereco"];
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => `"${(r[h]||"").toString().replace(/"/g,'""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mei-juiz-de-fora.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Renderiza lista de empresas
function renderResults(empresas) {
  resultadoDiv.innerHTML = "";
  empresas.forEach(emp => {
    const div = document.createElement("div");
    div.className = "empresa";
    div.innerHTML = `
      <strong>${emp.razao_social || emp.nome}</strong><br>
      📌 <strong>CNPJ:</strong> ${emp.cnpj} • 🏢 <strong>CNAE:</strong> ${emp.cnae || ""}<br>
      ✅ <strong>Situação:</strong> ${emp.situacao_cadastral || emp.situacao || ""} • 📍 ${formatEndereco(emp)}
    `;
    resultadoDiv.appendChild(div);
  });
}

// Monta gráfico de distribuição por CNAE
function buildChart(empresas) {
  const counts = {};
  empresas.forEach(e => {
    const key = e.cnae || "N/A";
    counts[key] = (counts[key] || 0) + 1;
  });
  const labels = Object.keys(counts).slice(0, 20);
  const data = labels.map(l => counts[l]);
  if (window._chart) window._chart.destroy();
  const ctx = graficoEl.getContext("2d");
  window._chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "MEIs", data, backgroundColor: "rgba(0,74,173,0.8)" }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// Evento de pesquisa
form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  statusEl.textContent = "Carregando dados...";
  resultadoDiv.innerHTML = "";
  try {
    const cidade = document.getElementById("cidade").value.trim();
    const estado = document.getElementById("estado").value.trim().toUpperCase();
    const cnae = document.getElementById("cnae").value.trim();

    const dados = await carregarDadosLocal();
    const empresas = dados.filter(emp => {
      const isCidade = (emp.municipio || "").toLowerCase() === cidade.toLowerCase();
      const isUF = (emp.uf || "").toUpperCase() === estado.toUpperCase
