const loginForm = document.querySelector("#loginForm");
const usernameInput = document.querySelector("#usernameInput");
const passwordInput = document.querySelector("#passwordInput");
const loginButton = document.querySelector("#loginButton");
const loginStatus = document.querySelector("#loginStatus");

function getNextUrl() {
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/admin.html";
  return next;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "请求失败");
  }
  return data;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginButton.disabled = true;
  loginStatus.textContent = "正在登录...";

  try {
    await postJson("/api/auth/login", {
      username: usernameInput.value.trim(),
      password: passwordInput.value,
    });
    window.location.href = getNextUrl();
  } catch (error) {
    loginStatus.textContent = error.message;
    passwordInput.select();
  } finally {
    loginButton.disabled = false;
  }
});
