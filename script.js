const form = document.getElementById('formPesquisa');
const resultadoDiv = document.getElementById('resultado');
const statusEl = document.getElementById('status');
const graficoEl = document.getElementById('grafico');

// Carregar estados do IBGE
async function carregarEstados() {
  const r = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados");
  const estados = await r.json();
  const select = document.getElementById("estado");
  estados.sort((a, b) => a.nome.localeCompare(b.nome));
  estados.forEach(e => {
    const opt = document.createElement("option");
    opt.value = e.sigla;
    opt.textContent = e.nome;
    select.appendChild(opt);
  });
}

// Carregar municípios do estado selecionado
async function carregarMunicipios(uf) {
  const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
  const municipios = await r.json();
  const select = document.getElementById("cidade");
  select.innerHTML = "";
  municipios.sort((a, b) => a.nome.localeCompare(b.nome));
  municipios.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.nome;
    opt.textContent = m.nome;
    select.appendChild(opt);
  });
}

// Carregar CNAEs do IBGE
async function carregarCNAEs() {
  const r = await fetch("https://servicodados.ibge.gov.br/api/v2/cnae/classes");
  const cnaes = await r.json();
  const select = document.getElementById("cnae");
  cnaes.sort((a, b) => a.descricao.localeCompare(b.descricao));
  cnaes.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.id} - ${c.descricao}`;
    select.appendChild(opt);
  });
}

// Inicialização
carregarEstados();
document.getElementById("estado").addEventListener("change", ev => {
  carregarMunicipios(ev.target.value);
});
carregarCNAEs();

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  resultadoDiv.innerHTML = "";
  statusEl.textContent = "Processando...";

  const cnpj = document.getElementById("cnpj").value.replace(/\D/g, "");
  const cidade = document.getElementById("cidade").value;
  const estado = document.getElementById("estado").value;
  const cnae = document.getElementById("cnae").value;

  try {
    let url = "";
    if (cnpj) {
      url = `https://api.opencnpj.org/v1/empresas/${cnpj}`;
    } else {
      url = "https://api.opencnpj.org/v1/empresas?";
      if (cnae) url += `cnae=${cnae}&`;
      if (cidade) url += `municipio=${cidade}&`;
      if (estado) url += `uf=${estado}&`;
    }

    if (!url || url.endsWith("?")) {
      statusEl.textContent = "Informe pelo menos um dado (CNPJ, CNAE, Cidade ou Estado).";
      return;
    }

    const r = await fetch(url);
    if (!r.ok) {
      statusEl.textContent = "Nenhum resultado encontrado ou erro na consulta.";
      return;
    }
    const dados = await r.json();

    const empresas = Array.isArray(dados) ? dados : [dados];
    const meiEmpresas = empresas.filter(e => e.simples?.mei === true);

    if (meiEmpresas.length === 0) {
      statusEl.textContent = "Nenhum MEI encontrado para os filtros informados.";
      return;
    }

    statusEl.textContent = `${meiEmpresas.length} MEI(s) encontrados.`;
    renderResultados(meiEmpresas);
    buildChart(meiEmpresas);
  } catch (err) {
    statusEl.textContent = "Erro: " + err.message;
  }
});

function renderResultados(empresas) {
  resultadoDiv.innerHTML = "";
  empresas.forEach(emp => {
    const li = document.createElement("li");
    li.className = "empresa";
    li.innerHTML = `
      <strong>${emp.razao_social}</strong><br>
      📌 CNPJ: ${emp.cnpj}<br>
      📍 Local: ${emp.municipio} / ${emp.uf}<br>
      👤 MEI: ${emp.simples?.mei ? "Sim" : "Não"}
    `;
    resultadoDiv.appendChild(li);
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
