import { API_URL } from "./constants.js";

document.getElementById("registerBtn").addEventListener("click", async () => {
  const regLogin = document.getElementById("regLogin").value.trim();
  const regPassword = document.getElementById("regPassword").value;

  if (!regLogin || !regPassword) {
    alert("Заполните логин и пароль");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/register.php`, {
      method: "POST",
      credentials: "include", // важно для сессии
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ regLogin, regPassword }),
    });

    const data = await res.json();

    if (data.success) {
      alert("Регистрация успешна!");
      location.href = "index.html"; // редирект на главную
    } else {
      alert(data.message || "Ошибка регистрации");
    }
  } catch (err) {
    console.error("Registration error:", err);
    alert("Ошибка сети");
  }
});
