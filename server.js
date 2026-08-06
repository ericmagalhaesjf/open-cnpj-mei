const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.get("/cnpj/:id", async (req, res) => {
  try {
    const r = await fetch(`https://www.receitaws.com.br/v1/cnpj/${req.params.id}`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
