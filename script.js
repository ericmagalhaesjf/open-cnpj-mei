document.getElementById("formPesquisa").addEventListener("submit", async function(e) {
  e.preventDefault();

  const cidade = document.getElementById("cidade").value;
  const estado = document.getElementById("estado").value;
  const cnae = document.getElementById("cnae").value;

  // Endpoint da API OpenCNPJ (ajuste conforme docs oficiais)
  const url = `https://api.opencnpj.org/v1/empresas?municipio=${cidade}&uf=${estado}&cnae=${cnae}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const resultadoDiv = document.getElementById("resultado");
    resultadoDiv.innerHTML = "";

    let atividades = {};

    if (data && data.empresas && data.empresas.length > 0) {
      data.empresas.forEach(emp => {
        // Filtro para MEI: natureza jurídica 213-5 ou nome empresarial no formato MEI
        const isMEI = emp.natureza_juridica === "213-5" || emp.nome.includes(emp.cnpj);

        if (isMEI) {
          const div = document.createElement("div");
          div.className = "empresa";
          div.innerHTML = `
            <strong>${emp.nome}</strong><br>
            📌 CNPJ: ${emp.cnpj}<br>
            🏢 CNAE: ${emp.cnae}<br>
            ✅ Situação: ${emp.situacao}<br>
            📍 Endereço: ${emp.endereco}<br>
          `;
          resultadoDiv.appendChild(div);

          atividades[emp.cnae] = (atividades[emp.cnae] || 0) + 1;
        }
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
    document.getElementById("resultado").innerHTML = "Erro na consulta: " + error.message;
  }
});
