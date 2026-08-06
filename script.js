const form = document.getElementById('formPesquisa');
const resultadoDiv = document.getElementById('resultado');
const statusEl = document.getElementById('status');

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

// Consulta ampla via OpenCNPJ
async function consultarOpenCNPJ(cnae, cidade, estado) {
  try {
    const url = `https://api.opencnpj.org/v1/empresas?cnae=${cnae}&municipio=${encodeURIComponent(cidade)}&uf=${estado}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("Erro na consulta OpenCNPJ");
    const dados = await r.json();
    const empresas = Array.isArray(dados) ? dados : [dados];
    const meiEmpresas = empresas.filter(e => e.simples?.mei === true);

    if (meiEmpresas.length === 0) {
      statusEl.textContent = "Nenhum MEI encontrado.";
      return;
    }

    statusEl.textContent = `${meiEmpresas.length} MEI(s) encontrados.`;
    renderResultados(meiEmpresas);
  } catch (err) {
    statusEl.textContent = "Erro: " + err.message;
  }
}

// Consulta detalhada via ReceitaWS
async function consultarReceitaWS(cnpj) {
  try {
    const url = `https://www.receitaws.com.br/v1/cnpj/${cnpj}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("Erro na consulta ReceitaWS");
    const data = await r.json();

    if (data.status === "ERROR") {
      statusEl.textContent = "Erro: " + data.message;
      return;
    }

    mostrarDetalhes(data);
  } catch (err) {
    statusEl.textContent = "Erro: " + err.message;
  }
}

// Renderização da lista
function renderResultados(empresas) {
  resultadoDiv.innerHTML = "";
  empresas.forEach(emp => {
    const li = document.createElement("li");
    li.className = "empresa";
    li.innerHTML = `
      <strong>${emp.razao_social}</strong><br>
      📌 CNPJ: ${emp.cnpj}<br>
      📍 Local: ${emp.municipio} / ${emp.uf}<br>
      👤 MEI: ${emp.simples?.mei ? "Sim" : "Não"}<br>
      <button onclick="consultarReceitaWS('${emp.cnpj}')">Detalhes</button>
    `;
    resultadoDiv.appendChild(li);
  });
}

// Mostrar detalhes ReceitaWS
function mostrarDetalhes(data) {
  const div = document.createElement("div");
  div.className = "detalhes";
  div.innerHTML = `
    <h3>Detalhes da Empresa</h3>
    <strong>${data.nome}</strong><br>
    Nome Fantasia: ${data.fantasia}<br>
    CNAE Principal: ${data.atividade_principal[0]?.code} - ${data.atividade_principal[0]?.text}<br>
    Endereço: ${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio} / ${data.uf}<br>
    Situação: ${data.situacao}<br>
    👤 MEI: ${data.natureza_juridica.includes("MEI") ? "Sim" : "Não"}
  `;
  resultadoDiv.appendChild(div);
}

// Evento do formulário
form.addEventListener("submit", ev => {
  ev.preventDefault();
  resultadoDiv.innerHTML = "";
  statusEl.textContent = "Processando...";

  const cnpj = document.getElementById("cnpj").value.replace(/\D/g, "");
  const cidade = document.getElementById("cidade").value;
  const estado = document.getElementById("estado").value;
  const cnae = document.getElementById("cnae").value;

  if (cnpj) {
    consultarReceitaWS(cnpj);
  } else if (cnae && cidade && estado) {
    consultarOpenCNPJ(cnae, cidade, estado);
  } else {
    statusEl.textContent = "Informe CNPJ ou CNAE + Cidade + Estado.";
  }
});
