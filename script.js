const form = document.getElementById('formPesquisa');
const resultadoDiv = document.getElementById('resultado');
const statusEl = document.getElementById('status');
const graficoEl = document.getElementById('grafico');
const btnExport = document.getElementById('btnExport');

let lastResults = [];

async function carregarDados() {
  try {
    const r = await fetch("dados-juiz-de-fora.json", { cache: "no-store" });
    if (!r.ok) throw new Error("Arquivo não encontrado");
    return await r.json();
  } catch (err) {
    throw new Error("Nenhum arquivo de dados disponível");
  }
}

function formatEndereco(emp) {
  return [emp.logradouro, emp.numero, emp.bairro, emp.municipio, emp.uf]
    .filter(Boolean).join(" • ");
}

function renderResults(empresas) {
  resultadoDiv.innerHTML = "";
  empresas.forEach(emp => {
    const div = document.createElement("div");
    div.className = "empresa";
    div.innerHTML = `
      <strong>${emp.razao_social}</strong><br>
      📌 <strong>CNPJ:</strong> ${emp.cnpj} • 🏢 <strong>CNAE:</strong> ${emp.cnae}<br>
      ✅ <strong>Situação:</strong> ${emp.situacao_cadastral} • 📍 ${formatEndereco(emp)}
    `;
    resultadoDiv.appendChild(div);
  });
}

function buildChart(empresas) {
  const counts = {};
  empresas.forEach(e => {
    counts[e.cnae] = (counts[e.cnae] || 0) + 1;
  });
  const labels = Object.keys(counts);
  const data = labels.map(l => counts[l]);
  if (window._chart) window._chart.destroy();
  const ctx = graficoEl.getContext("2d");
  window._chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "MEIs", data, backgroundColor: "rgba(0,74,173,0.8)" }] }
  });
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  statusEl.textContent = "Carregando dados...";
  try {
    const cidade = document.getElementById("cidade").value.trim().toLowerCase();
    const estado = document.getElementById("estado").value.trim().toUpperCase();
    const cnae = document.getElementById("cnae").value.trim();

    const dados = await carregarDados();
    const empresas = dados.filter(emp => {
      const isCidade = (emp.municipio || "").toLowerCase() === cidade;
      const isUF = (emp.uf || "").toUpperCase() === estado;
      const isMEI = emp.simples && emp.simples.mei === true;
      const isCNAE = !cnae || (emp.cnae || "").startsWith(cnae);
      return isCidade && isUF && isMEI && isCNAE;
    });

    lastResults = empresas;
    if (empresas.length === 0) {
      statusEl.textContent = "Nenhum MEI encontrado.";
      resultadoDiv.innerHTML = "";
      if (window._chart) window._chart.destroy();
      return;
    }

    statusEl.textContent = `${empresas.length} MEI(s) encontrados.`;
    renderResults(empresas);
    buildChart(empresas);
  } catch (err) {
    statusEl.textContent = "Erro: " + err.message;
  }
});

btnExport.addEventListener("click", () => {
  if (!lastResults.length) return;
  const headers = ["razao_social","cnpj","cnae","situacao_cadastral","logradouro","numero","bairro","municipio","uf"];
  const csv = [
    headers.join(","),
    ...lastResults.map(r => headers.map(h => `"${(r[h]||"").toString().replace(/"/g,'""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mei-juiz-de-fora.csv";
  a.click();
  URL.revokeObjectURL(url);
});
