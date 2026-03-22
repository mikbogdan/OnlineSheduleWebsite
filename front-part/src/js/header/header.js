import { API_URL } from "../constants";
//burger menu

const burger = document.getElementById("burger-menu");
const aside = document.getElementById("aside");

burger.addEventListener("click", () => {
  aside.classList.toggle("burger-active");
});

document.addEventListener("DOMContentLoaded", function () {
  const trigger = document.getElementById("location-trigger");
  const dropdown = document.getElementById("location-dropdown");
  const currentCitySpan = document.getElementById("current-city");

  // Загружаем сохранённый город или устанавливаем Бобруйск по умолчанию
  let selectedCity = localStorage.getItem("selectedCity") || "Бобруйск";
  currentCitySpan.textContent = selectedCity;
  localStorage.setItem("selectedCity", selectedCity);

  // Открытие/закрытие dropdown
  trigger.addEventListener("click", function (e) {
    e.preventDefault();
    dropdown.classList.toggle("active");
    trigger.classList.toggle("open");
  });

  // Закрытие при клике вне меню
  document.addEventListener("click", function (e) {
    if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("active");
      trigger.classList.remove("open");
    }
  });

  // Выбор города
  dropdown.querySelectorAll("li").forEach((item) => {
    item.addEventListener("click", function () {
      selectedCity = this.getAttribute("data-city");
      currentCitySpan.textContent = selectedCity;
      localStorage.setItem("selectedCity", selectedCity);

      // Закрываем меню после выбора
      dropdown.classList.remove("active");
      trigger.classList.remove("open");
    });
  });
});

export function createProfileModal() {
  const existing = document.getElementById("profileModal");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "profileModal";
  overlay.className = "profile-modal-overlay";

  overlay.innerHTML = `
    <div class="profile-modal">
      <div class="profile-modal-header">
        <h2>Профиль пользователя</h2>
        <span class="profile-modal-close" id="profileClose">&times;</span>
      </div>
      <div class="profile-modal-body">
        <p><strong>Логин:</strong> <span id="profileLogin">—</span></p>
        <p><strong>Роль:</strong> <span id="profileRole">—</span></p>
        <p><strong>Доступные филиалы:</strong> <span id="profileBranches">—</span></p>

        <div class="password-section">
          <div class="password-toggle" id="passwordToggle">
            Смена пароля <span class="arrow">▼</span>
          </div>
          <div class="password-form" id="passwordForm" style="display: none;">
            <input type="password" id="oldPassword" placeholder="Старый пароль" class="profile-input">
            <input type="password" id="newPassword" placeholder="Новый пароль" class="profile-input">
            <input type="password" id="newPasswordConfirm" placeholder="Повторите новый пароль" class="profile-input">
            <button id="changePasswordBtn" class="profile-btn profile-btn-save">Изменить пароль</button>
            <p id="passwordMessage" style="color: red; text-align: center; margin-top: 10px; min-height: 20px;"></p>
          </div>
        </div>
      </div>
      <div class="profile-modal-footer">
        <button id="profileLogoutBtn" class="profile-btn profile-btn-logout">Выйти из аккаунта</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // === Аккордеон для смены пароля ===
  const toggle = overlay.querySelector("#passwordToggle");
  const form = overlay.querySelector("#passwordForm");
  const arrow = toggle.querySelector(".arrow");

  toggle.addEventListener("click", () => {
    if (form.style.display === "none" || form.style.display === "") {
      form.style.display = "block";
      arrow.textContent = "▲";
    } else {
      form.style.display = "none";
      arrow.textContent = "▼";
    }
  });

  // Остальные обработчики (закрытие, смена пароля, выход) — как раньше
  overlay.querySelector("#profileClose").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  function closeModal() {
    overlay.style.display = "none";
    form.style.display = "none"; // скрываем форму при закрытии
    arrow.textContent = "▼";
    overlay.querySelector("#passwordMessage").textContent = "";
  }

  // Смена пароля
  overlay
    .querySelector("#changePasswordBtn")
    .addEventListener("click", async () => {
      const oldPass = overlay.querySelector("#oldPassword").value;
      const newPass = overlay.querySelector("#newPassword").value;
      const confirmPass = overlay.querySelector("#newPasswordConfirm").value;
      const msg = overlay.querySelector("#passwordMessage");

      msg.textContent = "";
      msg.style.color = "red";

      if (!oldPass || !newPass || !confirmPass) {
        msg.textContent = "Заполните все поля";
        return;
      }

      if (newPass !== confirmPass) {
        msg.textContent = "Новый пароль и подтверждение не совпадают";
        return;
      }

      if (newPass.length < 6) {
        msg.textContent = "Новый пароль должен быть не менее 6 символов";
        return;
      }

      try {
        const res = await fetch(`${API_URL}/change-password.php`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            old_password: oldPass,
            new_password: newPass,
          }),
        });

        const result = await res.json();

        if (result.success) {
          msg.style.color = "green";
          msg.textContent = "Пароль успешно изменён";
          setTimeout(() => {
            overlay.style.display = "none";
            msg.textContent = "";
          }, 2000);
        } else {
          msg.textContent = result.message || "Ошибка смены пароля";
        }
      } catch (err) {
        msg.textContent = "Ошибка сети";
      }
    });

  // Выход
  overlay.querySelector("#profileLogoutBtn").addEventListener("click", () => {
    fetch(`${API_URL}/logout.php`, { credentials: "include" }).finally(() => {
      location.href = "login.html";
    });
  });
}
