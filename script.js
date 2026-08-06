// Consulta ampla via OpenCNPJ
async function consultarOpenCNPJ(cnae, cidade, estado) {
  const url = `https://api.opencnpj.org/v1/empresas?cnae=${cnae}&municipio=${encodeURIComponent(cidade)}&uf=${estado}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Erro na consulta OpenCNPJ");
  const dados = await r.json();
  const meiEmpresas = dados.filter(e => e.simples?.mei === true);
  renderResultados(meiEmpresas);
}

// Consulta detalhada via ReceitaWS
async function consultarReceitaWS(cnpj) {
  const url = `https://www.receitaws.com.br/v1/cnpj/${cnpj}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Erro na consulta ReceitaWS");
  const data = await r.json();
  mostrarDetalhes(data);
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
