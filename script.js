const form = document.getElementById('formPesquisa');
const resultadoDiv = document.getElementById('resultado');
const statusEl = document.getElementById('status');
const graficoEl = document.getElementById('grafico');

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  statusEl.textContent = "Consultando API...";
  resultadoDiv.innerHTML = "";

  const cnpj = document.getElementById("cnpj").value.replace(/\D/g, "");
  if (!cnpj) {
    statusEl.textContent = "Digite um CNPJ válido.";
    return;
  }

  try {
    const r = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`);
    if (!r.ok) throw new Error("Erro na consulta");
    const data = await r.json();

    const simples = data.simples;
    const isMEI = simples?.mei_optante === true;

    const empresa = `
      <div class="empresa">
        <strong>${data.razao_social}</strong><br>
        📌 <strong>CNPJ:</strong> ${data.estabelecimento.cnpj}<br>
        🏢 <strong>CNAE:</strong> ${data.estabelecimento.atividade_principal?.subclasse}<br>
        ✅ <strong>Situação:</strong> ${data.estabelecimento.situacao_cadastral}<br>
        📍 <strong>Endereço:</strong> ${data.estabelecimento.logradouro}, ${data.estabelecimento.numero} - ${data.estabelecimento.bairro}, ${data.estabelecimento.cidade.nome} / ${data.estabelecimento.estado.sigla}<br>
        ⚖️ <strong>Simples Nacional:</strong> ${simples?.simples_optante ? "Optante" : "Não optante"}<br>
        👤 <strong>MEI:</strong> ${isMEI ? "Sim" : "Não"}
      </div>
    `;
    resultadoDiv.innerHTML = empresa;
    statusEl.textContent = "Consulta realizada com sucesso.";

    // Gráfico simples da situação cadastral
    if (window._chart) window._chart.destroy();
    const ctx = graficoEl.getContext("2d");
    window._chart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Ativa", "Baixada", "Suspensa"],
        datasets: [{
          data: [
            data.estabelecimento.situacao_cadastral === "ATIVA" ? 1 : 0,
            data.estabelecimento.situacao_cadastral === "BAIXADA" ? 1 : 0,
            data.estabelecimento.situacao_cadastral === "SUSPENSA" ? 1 : 0
          ],
          backgroundColor: ["#4caf50", "#f44336", "#ff9800"]
        }]
      }
    });

  } catch (err) {
    statusEl.textContent = "Erro: " + err.message;
  }
});
