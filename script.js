document.getElementById("formPesquisa").addEventListener("submit", async function(e) {
  e.preventDefault();

  const cidade = document.getElementById("cidade").value;
  const estado = document.getElementById("estado").value;
  const cnae = document.getElementById("cnae").value;

  const resultadoDiv = document.getElementById("resultado");
  resultadoDiv.innerHTML = "Carregando...";

  try {
    // Lendo dataset local atualizado pelo GitHub Actions
    const response = await fetch("dados.json");
    const data = await response.json();

    resultadoDiv.innerHTML = "";
    let atividades = {};

    // Filtrar apenas MEIs de Juiz de Fora
    const empresas = data.filter(emp => {
      const isCidade = emp.municipio === cidade && emp.uf === estado;
      const isMEI = emp.simples && emp.simples.mei === true;
      const isCNAE = !cnae || emp.cnae === cnae;
      return isCidade && isMEI && isCNAE;
    });

    if (empresas.length > 0) {
      empresas.forEach(emp => {
        const div = document.createElement("div");
        div.className = "empresa";
        div.innerHTML = `
          <strong>${emp.razao_social}</strong><br>
          📌 CNPJ: ${emp.cnpj}<br>
          🏢 CNAE: ${emp.cnae}<br>
          ✅ Situação: ${emp.situacao_cadastral}<br>
          📍 Endereço: ${emp.endereco}<br>
        `;
        resultadoDiv.appendChild(div);

        atividades[emp.cnae] = (atividades[emp.cnae] || 0) + 1;
      });

      // Gráfico de distribuição por CNAE
      const ctx = document.getElementById("grafico").getContext("2d");
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: Object.keys(atividades),
          datasets: [{
            label: "Número de MEIs",
            data: Object.values(atividades),
            backgroundColor: "rgba(0, 74, 173, 0.7)"
          }]
        }
      });
    } else {
      resultadoDiv.innerHTML = "Nenhum MEI encontrado.";
    }
  } catch (error) {
    resultadoDiv.innerHTML = "Erro na consulta: " + error.message;
  }
});
