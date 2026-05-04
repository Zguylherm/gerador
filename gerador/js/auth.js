"use strict";

const API_BASE = "/api";

const KNUZ_AUTH = (() => {
  let validationTimer = null;
  let isUnlocked = false;

  const loginScreen = document.getElementById("loginScreen");
  const appContainer = document.getElementById("appContainer");
  const keyInput = document.getElementById("keyInput");
  const loginBtn = document.getElementById("loginBtn");
  const loginMsg = document.getElementById("loginMsg");
  const keyInfo = document.getElementById("keyInfo");
  const loginForm = document.getElementById("loginForm");

  function setLoading(button, loading, loadingText, normalText){
    button.disabled = loading;
    button.textContent = loading ? loadingText : normalText;
  }

  function salvarKey(key){
    sessionStorage.setItem("user_key", key);
  }

  function pegarKey(){
    return sessionStorage.getItem("user_key");
  }

  function removerKey(){
    sessionStorage.removeItem("user_key");
    sessionStorage.removeItem("key_expires_at");
    isUnlocked = false;
  }

  function bloquearInterface(){
    isUnlocked = false;
    appContainer.classList.add("hidden");
    loginScreen.classList.remove("hidden");

    const resultado = document.getElementById("resultado");
    const qtd = document.getElementById("qtd");

    if(resultado) resultado.value = "";
    if(qtd) qtd.value = "";

    if(validationTimer){
      clearInterval(validationTimer);
      validationTimer = null;
    }
  }

  function mostrarLogin(msg = ""){
    bloquearInterface();
    loginMsg.textContent = msg;
  }

  function mostrarApp(data){
    loginScreen.classList.add("hidden");
    appContainer.classList.remove("hidden");
    isUnlocked = true;

    if(data && data.expires_at){
      sessionStorage.setItem("key_expires_at", data.expires_at);
      keyInfo.textContent = `Acesso liberado até: ${formatDate(new Date(data.expires_at))}`;
    }else{
      keyInfo.textContent = "Acesso liberado.";
    }

    iniciarVerificacaoAutomatica();
  }

  async function validarKey(key){
    const response = await fetch(`${API_BASE}/validate-key`, {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({ key }),
      cache:"no-store",
      credentials:"same-origin"
    });

    const data = await response.json().catch(() => ({}));

    if(!response.ok){
      throw new Error(data.detail || data.message || "Erro ao validar key.");
    }

    return data;
  }

  async function loginComKey(){
    const key = keyInput.value.trim();

    if(!key){
      loginMsg.textContent = "Digite uma key.";
      return;
    }

    loginMsg.textContent = "";
    setLoading(loginBtn, true, "Validando...", "Entrar");

    try{
      const data = await validarKey(key);

      if(!data.valid){
        removerKey();
        loginMsg.textContent = data.message || "Key inválida.";
        return;
      }

      salvarKey(key);
      keyInput.value = "";
      mostrarApp(data);

    }catch(error){
      removerKey();
      loginMsg.textContent = error.message || "Erro ao validar key.";
    }finally{
      setLoading(loginBtn, false, "Validando...", "Entrar");
    }
  }

  async function verificarSessao(){
    const keySalva = pegarKey();

    if(!keySalva){
      mostrarLogin();
      return false;
    }

    try{
      const data = await validarKey(keySalva);

      if(data.valid){
        mostrarApp(data);
        return true;
      }

      removerKey();
      mostrarLogin(data.message || "Sua key expirou ou ficou offline.");
      return false;

    }catch{
      removerKey();
      mostrarLogin("Não foi possível validar sua key.");
      return false;
    }
  }

  async function garantirAcesso(){
    const keySalva = pegarKey();

    if(!isUnlocked || !keySalva){
      mostrarLogin("Digite uma key válida para acessar.");
      return false;
    }

    try{
      const data = await validarKey(keySalva);

      if(!data.valid){
        removerKey();
        mostrarLogin(data.message || "Sua key expirou ou ficou offline.");
        return false;
      }

      if(data.expires_at){
        keyInfo.textContent = `Acesso liberado até: ${formatDate(new Date(data.expires_at))}`;
      }

      return true;

    }catch{
      removerKey();
      mostrarLogin("Sessão encerrada. Valide sua key novamente.");
      return false;
    }
  }

  function iniciarVerificacaoAutomatica(){
    if(validationTimer){
      clearInterval(validationTimer);
    }

    validationTimer = setInterval(async () => {
      const keySalva = pegarKey();

      if(!keySalva || !isUnlocked){
        mostrarLogin();
        return;
      }

      try{
        const data = await validarKey(keySalva);

        if(!data.valid){
          removerKey();
          mostrarLogin(data.message || "Sua key expirou ou ficou offline.");
          return;
        }

        if(data.expires_at){
          keyInfo.textContent = `Acesso liberado até: ${formatDate(new Date(data.expires_at))}`;
        }

      }catch{
        removerKey();
        mostrarLogin("Sessão encerrada. Valide sua key novamente.");
      }
    }, 30000);
  }

  function formatDate(date){
    if(Number.isNaN(date.getTime())){
      return "-";
    }

    return date.toLocaleString("pt-BR", {
      day:"2-digit",
      month:"2-digit",
      year:"numeric",
      hour:"2-digit",
      minute:"2-digit"
    });
  }

  function logout(msg = "Sessão encerrada."){
    removerKey();
    mostrarLogin(msg);
  }

  loginForm.addEventListener("submit", function(e){
    e.preventDefault();
    loginComKey();
  });

  document.addEventListener("visibilitychange", function(){
    if(document.visibilityState === "visible" && isUnlocked){
      garantirAcesso();
    }
  });

  window.addEventListener("pageshow", function(){
    verificarSessao();
  });

  return {
    pegarKey,
    garantirAcesso,
    logout,
    isUnlocked: () => isUnlocked,
    setInfo: (msg) => {
      keyInfo.textContent = msg;
    }
  };
})();

window.KNUZ_AUTH = KNUZ_AUTH;