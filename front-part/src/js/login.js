import { API_URL } from "./constants.js";

const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", async () => {
  const login = document.getElementById("login").value.trim();
  const password = document.getElementById("password").value;

  if (!login || !password) {
    alert("Заполните логин и пароль");
    return;
  }

  const res = await fetch(`${API_URL}/login.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ login, password }),
  });

  const data = await res.json();
  if (data.success) {
    location.href = "index.html";
  } else {
    alert(data.message);
  }
});
