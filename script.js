const form = document.getElementById('formPesquisa');
const resultadoDiv = document.getElementById('resultado');
const statusEl = document.getElementById('status');
const graficoEl = document.getElementById('grafico');

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  resultadoDiv.innerHTML = "";
  statusEl.textContent = "Processando...";

  const cnpj = document.getElementById("cnpj").value.replace(/\D/g, "");
  const cidade = document.getElementById("cidade").value.trim().toLowerCase();
  const estado = document.getElementById("estado").value.trim().toUpperCase();
  const cnae = document.getElementById("cnae").value.trim();

  if (cnpj) {
    consultarCNPJ(cnpj);
  } else if (cnae && cidade && estado) {
    // Exemplo: dataset local com lista de CNPJs da cidade
    const listaCNPJs = await carregarDatasetLocal(cidade, estado);
    statusEl.textContent = `Consultando ${listaCNPJs.length} empresas... (máx 3/minuto)`;
    consultarFila(listaCNPJs, cnae);
  } else {
    statusEl.textContent = "Informe CNPJ ou Cidade + Estado + CNAE.";
  }
});

async function consultarCNPJ(cnpj) {
  try {
    const r = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`);
    if (r.status === 429) {
      const erro = await r.json();
      statusEl.textContent = `Erro: ${erro.titulo} - ${erro.detalhes}`;
      return;
    }
    if (!r.ok) throw new Error("Erro na consulta");
    const data = await r.json();
    mostrarEmpresa(data);
  } catch (err) {
    statusEl.textContent = "Erro: " + err.message;
  }
}

async function carregarDatasetLocal(cidade, estado) {
  // Aqui você mantém um arquivo JSON com todos os CNPJs da cidade
  const r = await fetch("dados-juiz-de-fora.json");
  const dados = await r.json();
  return dados.filter(e => e.municipio.toLowerCase() === cidade && e.uf === estado).map(e => e.cnpj);
}

function consultarFila(listaCNPJs, cnae) {
  let i = 0;
  const resultados = [];

  const intervalo = setInterval(async () => {
    if (i >= listaCNPJs.length) {
      clearInterval(intervalo);
      statusEl.textContent = `Consulta finalizada. ${resultados.length} MEIs encontrados.`;
      renderResultados(resultados);
      return;
    }

    const cnpj = listaCNPJs[i];
    statusEl.textContent = `Consultando ${cnpj} (${i+1}/${listaCNPJs.length})...`;

    try {
      const r = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`);
      if (r.ok) {
        const data = await r.json();
        if (data.simples?.mei === true && (!cnae || data.estabelecimento.atividade_principal?.subclasse.startsWith(cnae))) {
          resultados.push(data);
          mostrarEmpresa(data);
        }
      }
    } catch (err) {
      console.error("Erro:", err);
    }
    i++;
  }, 20000); // 20 segundos entre chamadas (3/minuto)
}

function mostrarEmpresa(data) {
  const simples = data.simples;
  const isSimples = simples?.simples === true;
  const isMEI = simples?.mei === true;

  const empresa = `
    <div class="empresa">
      <strong>${data.razao_social}</strong><br>
      📌 <strong>CNPJ:</strong> ${data.estabelecimento.cnpj}<br>
      🏢 <strong>CNAE:</strong> ${data.estabelecimento.atividade_principal?.subclasse}<br>
      ✅ <strong>Situação:</strong> ${data.estabelecimento.situacao_cadastral}<br>
      📍 <strong>Endereço:</strong> ${data.estabelecimento.logradouro}, ${data.estabelecimento.numero} - ${data.estabelecimento.bairro}, ${data.estabelecimento.cidade.nome} / ${data.estabelecimento.estado.sigla}<br>
      ⚖️ <strong>Simples Nacional:</strong> ${isSimples ? "Optante" : "Não optante"}<br>
      👤 <strong>MEI:</strong> ${isMEI ? "Sim" : "Não"}
    </div>
  `;
  resultadoDiv.innerHTML += empresa;
}

function renderResultados(empresas) {
  // Exemplo de gráfico por CNAE
  const counts = {};
  empresas.forEach(e => {
    const cnae = e.estabelecimento.atividade_principal?.subclasse || "Desconhecido";
    counts[cnae] = (counts[cnae] || 0) + 1;
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
