import {
  selectedTeacherId,
  clearTeacherForm,
} from "./main-content/main-content.js";
import {} from "./header/header.js";
import { saveDBTeacher, loadTeachers } from "./services/database.js";
import {
  addContact,
  fillTeacherFormForEdit,
} from "./main-content/teachersForm.js";
import {} from "./main-content/settings.js";
import { loadLessons } from "./main-content/schedule.js";
import { loadClients } from "./main-content/clients.js";
import { API_URL } from "./constants.js";
import {} from "./main-content/report.js";
import {} from "./rolePermissions.js";
import {} from "./main-content/crm.js";
import { loadAdminUsers } from "./main-content/crm.js";

const STORAGE_KEY = "activeMainTab";

const tabLoaders = {
  teachers: loadTeachers,
  clients: loadClients,
  // subjects: loadSubjects,
  // cabinets: loadCabinets,
  crm: loadAdminUsers(1),
  lessons: loadLessons,
};

function activateTab(target) {
  if (!target) return;

  const content = document.querySelector(
    `.main-content[data-target="${target}"], .settings-part[data-target="${target}"]`,
  );
  if (!content) return;

  // Убираем active у всех пунктов меню
  document
    .querySelectorAll(".sidebar__nav__item, .header-items__list__item")
    .forEach((el) => {
      el.classList.remove("header-items__list__item__active");
      el.classList.remove("sidebar__nav__item__active");
    });

  // Убираем active у всего контента
  document.querySelectorAll(".main-content, .settings-part").forEach((el) => {
    el.classList.remove("main-content__active");
    el.classList.remove("settings-part__active");
  });

  if (document.getElementById("scheduleReportTable")) {
    document.getElementById("scheduleReportTable").remove();
  }

  // Активируем выбранный пункт меню
  const activeItem = document.querySelector(
    `.sidebar__nav__item[data-target="${target}"], .header-items__list__item[data-target="${target}"]`,
  );
  if (activeItem) {
    if (activeItem.classList.contains("sidebar__nav__item")) {
      activeItem.classList.add("sidebar__nav__item__active");
    }
    if (activeItem.classList.contains("header-items__list__item")) {
      activeItem.classList.add("header-items__list__item__active");
    }
  }

  // Активируем контент
  if (activeItem && activeItem.classList.contains("header-items__list__item")) {
    content.classList.add("settings-part__active");
  } else {
    content.classList.add("main-content__active");
  }

  // === КЛЮЧЕВОЕ: вызываем функцию загрузки данных для этой вкладки ===
  const loader = tabLoaders[target];
  if (loader && typeof loader === "function") {
    console.log(`Загружаем данные для вкладки: ${target}`);
    loader(); // ← здесь вызывается нужная функция
  } else {
    console.warn(`Нет функции загрузки для вкладки: ${target}`);
  }

  // Сохраняем в localStorage
  localStorage.setItem(STORAGE_KEY, target);
}

// Основной обработчик клика
document.addEventListener("click", (e) => {
  // Находим ближайший элемент с нужным классом или атрибутом
  const sidebarItem = e.target.closest(
    ".sidebar__nav__item, .header-items__list__item, [data-target]",
  );

  if (!sidebarItem) return; // клик не по нужному элементу

  // Предотвращаем дефолтное поведение только если элемент имеет data-target
  const target = sidebarItem.dataset.target;
  if (!target) return;

  e.preventDefault(); // теперь безопасно

  activateTab(target);
});

// === Восстановление активного таба при загрузке страницы ===
document.addEventListener("DOMContentLoaded", () => {
  const savedTab = localStorage.getItem(STORAGE_KEY);

  if (savedTab) {
    activateTab(savedTab);
  } else {
    activateTab("lessons"); // или любой другой по умолчанию
  }
});

const teachersForm = document.getElementById("teachersForm");

const addTeacher = document.getElementById("addTeacher");
//Кнопка "Добавление учителя"
addTeacher.addEventListener("click", () => {
  addContact();
  teachersForm.classList.add("teachers-form__active");
  clearTeacherForm();
});

const editTeacher = document.getElementById("editTeacher");
// Кнопка "Редактировать выбранного учителя"
editTeacher.addEventListener("click", async () => {
  addContact();
  if (!selectedTeacherId) {
    alert("Выберите педагога для редактирования");
    return;
  }

  try {
    const branch = localStorage.getItem("selectedCity") || "Бобруйск";

    // Формируем URL с параметром branch
    const url = `${API_URL}/teachers.php?branch=${encodeURIComponent(branch)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Ошибка сети: " + response.status);
    }

    const result = await response.json();

    const teacher = result.data?.find((t) => t.id == selectedTeacherId);
    if (!teacher) {
      alert("Педагог не найден в данных");
      return;
    }

    teachersForm.classList.add("teachers-form__active");

    // Заполняем форму данными педагога
    fillTeacherFormForEdit(teacher);

    // Меняем заголовок
    const modalTitle = document.querySelector(".teachers-form__header");
    if (modalTitle) {
      modalTitle.innerHTML =
        "Редактировать педагога<div class='teachers-form__close' id='teachersFormClose'>&times</div>";
      const teachersFormClose = document.getElementById("teachersFormClose");
      teachersFormClose.addEventListener("click", () => {
        clearTeacherForm();
        teachersForm.classList.remove("teachers-form__active");
      });
    }

    // Меняем текст кнопки
    const saveBtn = document.getElementById("saveTeacher");
    if (saveBtn) {
      saveBtn.textContent = "Сохранить изменения";
    }

    // Сохраняем ID — чтобы при сохранении знать, что это редактирование
    window.editingTeacherId = selectedTeacherId;
  } catch (err) {
    console.error("Ошибка при открытии редактирования:", err);
    alert("Не удалось загрузить данные педагога");
  }
});

const teachersFormCloseBtn = document.getElementById("teachersFormCloseBtn");
const teachersOverlay = document.getElementById("teachersFormOver");

teachersOverlay.addEventListener("click", (e) => {
  if (e.target === teachersOverlay) {
    teachersForm.classList.remove("teachers-form__active");
    clearTeacherForm();
  }
});

teachersFormCloseBtn.addEventListener("click", () => {
  clearTeacherForm();
  teachersForm.classList.remove("teachers-form__active");
});

const saveTeacher = document.getElementById("saveTeacher");

saveTeacher.addEventListener("click", () => {
  saveDBTeacher();
});
