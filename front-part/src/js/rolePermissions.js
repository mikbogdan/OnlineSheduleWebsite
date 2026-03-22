import { API_URL } from "./constants";
import { createProfileModal } from "./header/header";

export async function checkAuthAndApplyRestrictions() {
  try {
    const res = await fetch(`${API_URL}/check-auth.php`, {
      method: "GET",
      credentials: "include",
    });

    const text = await res.text(); // сначала текст

    if (!res.ok || text.trim() === "") {
      throw new Error("Bad response");
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr);
      throw new Error("Invalid JSON response");
    }

    if (!data.authenticated) {
      location.href = "login.html";
      return;
    }

    // Применяем роль и филиалы с сервера
    window.t_id = data.t_id || null;

    const userRole = data.role || "student";
    if (userRole === "admin" || userRole === "superadmin") {
      window.userRoleCheck = false;
    } else {
      window.userRoleCheck = true;
    }
    const userBranchesStr = data.branches || "";
    const userBranches = userBranchesStr
      ? userBranchesStr
          .split(",")
          .map((b) => b.trim())
          .filter((b) => b)
      : [];

    const userLogin = data.login || "Пользователь"; // на случай, если не передан
    const userNameSpan = document.querySelector(".user-profile__wrap span");
    if (userNameSpan) {
      userNameSpan.textContent = userLogin;
    }

    // Клик по профилю — открываем модалку
    const profileWrap = document.querySelector(".user-profile__wrap");
    if (profileWrap) {
      profileWrap.style.cursor = "pointer";
      profileWrap.addEventListener("click", () => {
        createProfileModal();
        const modal = document.getElementById("profileModal");
        if (modal) {
          // Заполняем данные
          modal.querySelector("#profileLogin").textContent = data.login || "—";
          modal.querySelector("#profileRole").textContent = userRole;
          modal.querySelector("#profileBranches").textContent =
            userBranches.join(", ") || "Все";
        }
      });
    }
    if (userRole === "admin") {
      document.getElementById("crm")?.remove();
    }
    // Твой код ограничений
    if (userRole === "student" || userRole === "teacher") {
      document.getElementById("settings-part")?.remove();
      document.getElementById("teachers-part")?.remove();
      document.getElementById("legal_entities-part")?.remove();
      document.getElementById("crm-part")?.remove();

      document.getElementById("teachers")?.remove();
      document.getElementById("legal_entities")?.remove();
      document.getElementById("crm")?.remove();
      document.querySelectorAll(".clients-header").forEach((el) => el.remove());
      document.getElementById("settings")?.remove();
      if (userRole === "student") {
        document.getElementById("clients")?.remove();
        document.getElementById("clients-part")?.remove();
      }
    }

    // Ограничение филиалов
    const locationDropdown = document.getElementById("location-dropdown");
    const currentCitySpan = document.getElementById("current-city");

    if (locationDropdown && userRole !== "superadmin") {
      Array.from(locationDropdown.children).forEach((li) => {
        const city = li.getAttribute("data-city");
        if (city && !userBranches.includes(city)) {
          li.remove();
        }
      });

      let currentCity = localStorage.getItem("selectedCity");
      if (!userBranches.includes(currentCity)) {
        currentCity = userBranches[0] || "Бобруйск";
        localStorage.setItem("selectedCity", currentCity);
      }
      if (currentCitySpan) currentCitySpan.textContent = currentCity;
    } else if (currentCitySpan) {
      currentCitySpan.textContent =
        localStorage.getItem("selectedCity") || "Бобруйск";
    }
  } catch (err) {
    console.error("Auth check failed:", err);
    location.href = "login.html";
  }
}

document.addEventListener("DOMContentLoaded", checkAuthAndApplyRestrictions);
