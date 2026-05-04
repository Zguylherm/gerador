"use strict";

const KNUZ_APP = (() => {
  let tipoSelecionado = "canva";

  const dropdown = document.getElementById("dropdown");
  const selectedBtn = document.getElementById("selectedBtn");
  const selectedOption = document.getElementById("selectedOption");
  const options = document.getElementById("options");
  const optionButtons = document.querySelectorAll(".option-btn");

  const qtdInput = document.getElementById("qtd");
  const resultado = document.getElementById("resultado");
  const generateBtn = document.getElementById("generateBtn");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");

  function toggleDropdown(){
    if(!window.KNUZ_AUTH.isUnlocked()) return;
    options.classList.toggle("open");
  }

  function closeDropdown(){
    options.classList.remove("open");
  }

  function selectOption(button){
    tipoSelecionado = button.dataset.type;
    selectedOption.innerHTML = button.innerHTML;
    closeDropdown();
  }

  async function gerarSeguro(){
    const accessOk = await window.KNUZ_AUTH.garantirAcesso();

    if(!accessOk){
      return;
    }

    const qtd = Number(qtdInput.value);
    const key = window.KNUZ_AUTH.pegarKey();

    if(!qtd || qtd <= 0){
      resultado.value = "Digite uma quantidade válida.";
      return;
    }

    if(qtd > 500){
      resultado.value = "Limite máximo: 500.";
      return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = "Gerando...";

    try{
      const response = await fetch("/api/generate", {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          key,
          type:tipoSelecionado,
          amount:qtd
        }),
        cache:"no-store",
        credentials:"same-origin"
      });

      const data = await response.json().catch(() => ({}));

      if(!response.ok || !data.success){
        throw new Error(data.message || data.detail || "Erro ao gerar.");
      }

      resultado.value = Array.isArray(data.results) ? data.results.join("\n") : "";
      window.KNUZ_AUTH.setInfo("Resultado gerado com sucesso.");

    }catch(error){
      resultado.value = "";
      window.KNUZ_AUTH.setInfo(error.message || "Erro ao gerar.");
    }finally{
      generateBtn.disabled = false;
      generateBtn.textContent = "Gerar";
    }
  }

  async function copiarResultado(){
    const accessOk = await window.KNUZ_AUTH.garantirAcesso();

    if(!accessOk){
      return;
    }

    if(!resultado.value.trim()){
      window.KNUZ_AUTH.setInfo("Nenhum resultado para copiar.");
      return;
    }

    navigator.clipboard.writeText(resultado.value).then(() => {
      window.KNUZ_AUTH.setInfo("Resultado copiado com sucesso.");
    }).catch(() => {
      window.KNUZ_AUTH.setInfo("Não foi possível copiar.");
    });
  }

  function limparResultado(){
    resultado.value = "";
    qtdInput.value = "";
    window.KNUZ_AUTH.setInfo("Resultado limpo.");
  }

  selectedBtn.addEventListener("click", toggleDropdown);
  generateBtn.addEventListener("click", gerarSeguro);
  copyBtn.addEventListener("click", copiarResultado);
  clearBtn.addEventListener("click", limparResultado);

  optionButtons.forEach((button) => {
    button.addEventListener("click", () => selectOption(button));
  });

  document.addEventListener("click", function(e){
    if(dropdown && !dropdown.contains(e.target)){
      closeDropdown();
    }
  });

  selectOption(document.querySelector('.option-btn[data-type="canva"]'));

  return {};
})();

window.KNUZ_APP = KNUZ_APP;