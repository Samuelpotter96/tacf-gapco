# Calculadora TACF · GAPCO

Calculadora do **Teste de Avaliação do Condicionamento Físico (TACF)** pela **NSCA 54-3/2026**, feita para o **Grupamento de Apoio de Canoas (GAPCO)**.

Desenvolvido por **3S Potter**.

## O que faz

- Pontua cintura, flexão de braço, abdominal e prova aeróbica (corrida 12 min ou marcha 4,8 km) pelas tabelas do Anexo VI.
- Mostra os pontos de cada prova enquanto você digita e quanto falta para a próxima menção.
- Calcula o grau final, APTO / NÃO APTO e a menção (I, S, B, MB, E).
- Monta a tabela de metas (S, B, MB, E e Máximo) para o seu sexo, idade e estatura.
- Feminino: opção de flexão com joelhos apoiados (transição do Art. 109).
- Alerta de FC de repouso acima de 100 bpm (Art. 24).

## Estrutura

```
index.html        página
css/style.css     visual
js/tabelas.js     tabelas oficiais (somente dados)
js/calculo.js     cálculo do TACF (sem DOM)
js/metas.js       metas por menção (sem DOM)
js/app.js         liga o formulário ao cálculo
```

Site estático, sem servidor nem banco de dados: nada do que é digitado sai do navegador.

## Publicar no GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → Branch `main`, pasta `/ (root)` → Save.
O site fica em `https://<seu-usuario>.github.io/tacf-gapco/`.

Para testar no computador (os módulos JS precisam de um servidor local):

```bash
python -m http.server 5173
```

e abra `http://localhost:5173`.

## Aviso

Ferramenta de apoio, **não oficial**. O resultado que vale é o da comissão aplicadora do TACF.
