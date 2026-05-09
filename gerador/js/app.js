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

  const tiposPermitidos = [
    "canva",
    "spotify",
    "deezer",
    "yt",
    "youtube",
    "primevideo",
    "prime",
    "prime video"
  ];

  function toggleDropdown(){
    if(!window.KNUZ_AUTH || !window.KNUZ_AUTH.isUnlocked()) return;

    options.classList.toggle("open");
  }

  function closeDropdown(){
    if(options){
      options.classList.remove("open");
    }
  }

  function selectOption(button){
    if(!button) return;

    const tipo = String(button.dataset.type || "").trim().toLowerCase();

    if(!tiposPermitidos.includes(tipo)){
      if(window.KNUZ_AUTH){
        window.KNUZ_AUTH.setInfo("Plataforma inválida.");
      }
      return;
    }

    tipoSelecionado = tipo;
    selectedOption.innerHTML = button.innerHTML;
    closeDropdown();
  }

  async function gerarSeguro(){
    if(!window.KNUZ_AUTH){
      resultado.value = "Sistema de autenticação não carregado.";
      return;
    }

    const accessOk = await window.KNUZ_AUTH.garantirAcesso();

    if(!accessOk){
      return;
    }

    const qtd = Number(qtdInput.value);
    const key = window.KNUZ_AUTH.pegarKey();

    if(!key){
      resultado.value = "Key não encontrada. Faça login novamente.";
      return;
    }

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
          amount:qtd,
          device_id: window.KNUZ_AUTH.getDeviceId()
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
    if(!window.KNUZ_AUTH){
      return;
    }

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

    if(window.KNUZ_AUTH){
      window.KNUZ_AUTH.setInfo("Resultado limpo.");
    }
  }

  if(selectedBtn){
    selectedBtn.addEventListener("click", toggleDropdown);
  }

  if(generateBtn){
    generateBtn.addEventListener("click", gerarSeguro);
  }

  if(copyBtn){
    copyBtn.addEventListener("click", copiarResultado);
  }

  if(clearBtn){
    clearBtn.addEventListener("click", limparResultado);
  }

  optionButtons.forEach((button) => {
    button.addEventListener("click", () => selectOption(button));
  });

  document.addEventListener("click", function(e){
    if(dropdown && !dropdown.contains(e.target)){
      closeDropdown();
    }
  });

  const defaultOption = document.querySelector('.option-btn[data-type="canva"]');

  if(defaultOption){
    selectOption(defaultOption);
  }

  return {
    getTipoSelecionado: () => tipoSelecionado
  };
})();

window.KNUZ_APP = KNUZ_APP;
