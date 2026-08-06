const form = document.getElementById('formPesquisa');
const resultadoDiv = document.getElementById('resultado');
const statusEl = document.getElementById('status');
const graficoEl = document.getElementById('grafico');

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  resultadoDiv.innerHTML = "";
  statusEl.textContent = "Consultando OpenCNPJ...";

  const cidade = document.getElementById("cidade").value.trim();
  const estado = document.getElementById("estado").value.trim().toUpperCase();
  const cnae = document.getElementById("cnae").value.trim();

  try {
    const url = `https://api.opencnpj.org/v1/empresas?cnae=${cnae}&municipio=${cidade}&uf=${estado}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("Erro na consulta");
    const dados = await r.json();

    const empresas = dados.filter(e => e.simples?.mei === true);
    if (empresas.length === 0) {
      statusEl.textContent = "Nenhum MEI encontrado.";
      return;
    }

    statusEl.textContent = `${empresas.length} MEI(s) encontrados.`;
    renderResultados(empresas);
    buildChart(empresas);
  } catch (err) {
    statusEl.textContent = "Erro: " + err.message;
  }
});

function renderResultados(empresas) {
  resultadoDiv.innerHTML = "";
  empresas.forEach(emp => {
    const div = document.createElement("div");
    div.className = "empresa";
    div.innerHTML = `
      <strong>${emp.razao_social}</strong><br>
      📌 <strong>CNPJ:</strong> ${emp.cnpj}<br>
      🏢 <strong>CNAE:</strong> ${emp.cnae}<br>
      ✅ <strong>Situação:</strong> ${emp.situacao_cadastral}<br>
      📍 <strong>Endereço:</strong> ${emp.logradouro}, ${emp.numero} - ${emp.bairro}, ${emp.municipio} / ${emp.uf}
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
