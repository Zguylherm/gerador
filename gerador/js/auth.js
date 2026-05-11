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

  function getDeviceId(){
    let deviceId = localStorage.getItem("veltrix_device_id");

    if(!deviceId){
      if(window.crypto && crypto.randomUUID){
        deviceId = crypto.randomUUID();
      }else{
        deviceId = "dev_" +
          Math.random().toString(36).slice(2) +
          Date.now().toString(36) +
          Math.random().toString(36).slice(2);
      }

      localStorage.setItem("veltrix_device_id", deviceId);
    }

    return deviceId;
  }

  function setLoading(button, loading, loadingText, normalText){
    if(!button) return;

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

    if(appContainer){
      appContainer.classList.add("hidden");
    }

    if(loginScreen){
      loginScreen.classList.remove("hidden");
    }

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

    if(loginMsg){
      loginMsg.textContent = msg;
    }
  }

  function mostrarApp(data){
    if(loginScreen){
      loginScreen.classList.add("hidden");
    }

    if(appContainer){
      appContainer.classList.remove("hidden");
    }

    isUnlocked = true;

    if(data && data.expires_at){
      sessionStorage.setItem("key_expires_at", data.expires_at);

      if(keyInfo){
        keyInfo.textContent = `Acesso liberado até: ${formatDate(new Date(data.expires_at))}`;
      }
    }else{
      if(keyInfo){
        keyInfo.textContent = "Acesso liberado.";
      }
    }

    iniciarVerificacaoAutomatica();
  }

  async function validarKey(key){
    const response = await fetch(`${API_BASE}/validate-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        key,
        device_id: getDeviceId()
      }),
      cache: "no-store",
      credentials: "same-origin"
    });

    const data = await response.json().catch(() => ({}));

    if(!response.ok){
      throw new Error(data.detail || data.message || "Erro ao validar key.");
    }

    return data;
  }

  async function loginComKey(){
    const key = keyInput ? keyInput.value.trim() : "";

    if(!key){
      if(loginMsg){
        loginMsg.textContent = "Digite uma key.";
      }
      return;
    }

    if(loginMsg){
      loginMsg.textContent = "";
    }

    setLoading(loginBtn, true, "Validando...", "Entrar");

    try{
      const data = await validarKey(key);

      if(!data.valid){
        removerKey();

        if(loginMsg){
          loginMsg.textContent = data.message || "Key inválida.";
        }

        return;
      }

      salvarKey(key);

      if(keyInput){
        keyInput.value = "";
      }

      mostrarApp(data);

    }catch(error){
      removerKey();

      if(loginMsg){
        loginMsg.textContent = error.message || "Erro ao validar key.";
      }
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

      if(data.status === "device_blocked"){
        mostrarLogin(data.message || "Essa key já está vinculada a outro dispositivo.");
      }else{
        mostrarLogin(data.message || "Sua key expirou, ficou offline ou está inválida.");
      }

      return false;

    }catch(error){
      removerKey();
      mostrarLogin(error.message || "Não foi possível validar sua key.");
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

        if(data.status === "device_blocked"){
          mostrarLogin(data.message || "Essa key já está vinculada a outro dispositivo.");
        }else{
          mostrarLogin(data.message || "Sua key expirou, ficou offline ou está inválida.");
        }

        return false;
      }

      if(data.expires_at && keyInfo){
        keyInfo.textContent = `Acesso liberado até: ${formatDate(new Date(data.expires_at))}`;
      }

      return true;

    }catch(error){
      removerKey();
      mostrarLogin(error.message || "Sessão encerrada. Valide sua key novamente.");
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

          if(data.status === "device_blocked"){
            mostrarLogin(data.message || "Essa key já está vinculada a outro dispositivo.");
          }else{
            mostrarLogin(data.message || "Sua key expirou, ficou offline ou está inválida.");
          }

          return;
        }

        if(data.expires_at && keyInfo){
          keyInfo.textContent = `Acesso liberado até: ${formatDate(new Date(data.expires_at))}`;
        }

      }catch(error){
        removerKey();
        mostrarLogin(error.message || "Sessão encerrada. Valide sua key novamente.");
      }
    }, 30000);
  }

  function formatDate(date){
    if(Number.isNaN(date.getTime())){
      return "-";
    }

    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function logout(msg = "Sessão encerrada."){
    removerKey();
    mostrarLogin(msg);
  }

  if(loginForm){
    loginForm.addEventListener("submit", function(e){
      e.preventDefault();
      loginComKey();
    });
  }

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
    getDeviceId,
    isUnlocked: () => isUnlocked,
    setInfo: (msg) => {
      if(keyInfo){
        keyInfo.textContent = msg;
      }
    }
  };
})();

window.KNUZ_AUTH = KNUZ_AUTH;
