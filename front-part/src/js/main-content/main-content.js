import { deleteDB } from "../services/database.js";

//add table row
export let selectedTeacherId = null;

const tableDB = document.getElementById("tableDB");

export function tableAdd(item) {
  const tableTr = document.createElement("tr");
  tableTr.classList.add("table-tr");

  tableTr.addEventListener("click", () => {
    if (!tableTr || !tableTr.querySelector('input[type="checkbox"]')) return;

    const checkbox = tableTr.querySelector('input[type="checkbox"]');

    // Снимаем выделение со всех строк
    document.querySelectorAll("tbody tr").forEach((r) => {
      r.classList.remove("selected-row");
    });
    document.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      if (cb !== checkbox) cb.checked = false;
    });

    // Включаем/выключаем текущую
    checkbox.checked = !checkbox.checked;

    if (checkbox.checked) {
      // Берём ID из кнопки удаления в этой строке
      selectedTeacherId = delTeacherBtn ? delTeacherBtn.dataset.id : null;
      // Активируем кнопку редактирования
      document.getElementById("editTeacher").disabled = false;
    } else {
      selectedTeacherId = null;
      document.getElementById("editTeacher").disabled = true;
    }
  });

  const tableTd = document.createElement("td");
  const teacherCheck = document.createElement("input");
  teacherCheck.type = "checkbox";
  tableTd.appendChild(teacherCheck);
  tableTr.appendChild(tableTd);

  const fields = [
    item.id,
    item.avatar || "—",
    item.full_name, // ФИО
    item.sex, // Пол
    item.DOB || "—", // Дата рождения
    item.contacts || "—", // Контакты
    item.description || "—", // Описание
  ];

  fields.forEach((value, index) => {
    const tableTd = document.createElement("td");
    if (index === 5) {
      // 3-й индекс — контакты
      const contactsStr = item.contacts || "";

      if (contactsStr.trim() === "") {
        tableTd.textContent = "—";
      } else {
        const contactsLines = contactsStr.split("\n"); // разделяем по переносу строки

        contactsLines.forEach((line) => {
          if (line.trim() === "") return;

          const p = document.createElement("p");
          p.style.margin = "4px 0"; // отступ между строками
          p.textContent = line.trim();
          tableTd.appendChild(p);
        });
      }
    } else {
      tableTd.textContent = value;
    }
    tableTr.appendChild(tableTd);
  });
  const delTeacherBtn = document.createElement("td");
  delTeacherBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
  delTeacherBtn.classList.add("delete-teacher");
  delTeacherBtn.dataset.id = item.id;
  tableTr.appendChild(delTeacherBtn);

  // Удаление педагога по кнопке с корзиной
  delTeacherBtn.addEventListener("click", () => {
    deleteDB(delTeacherBtn);
  });

  tableDB.appendChild(tableTr);
}

export function collectTeacherData() {
  const fullName = document
    .querySelector('.teachers-form__input[placeholder*="Например"]')
    ?.value.trim();
  if (!fullName) {
    alert("Введите ФИО педагога!");
    return;
  }

  // Пол
  const genderBtn = document.querySelector(
    ".teachers-form__gender-btn--active",
  );
  const sex = genderBtn?.textContent.trim() === "М." ? "Мужской" : "Женский";

  // Дата рождения
  const DOB = document.querySelector('input[type="date"]')?.value || null;

  // Филиалы — строка через запятую
  const branchesArr = Array.from(
    document.querySelectorAll(
      '.teachers-form__checkboxes input[type="checkbox"]:checked',
    ),
  ).map((cb) => cb.parentElement.textContent.trim().replace(/\s+/g, " "));

  const branches = branchesArr.length ? branchesArr.join(", ") : null;

  // Контакты — собираем в одну строку
  const contactLines = [];

  document.querySelectorAll(".teachers-form__contact-row").forEach((row) => {
    const valueInput = row.querySelector(".teachers-form__contact-value");
    const noteInput =
      row.querySelectorAll(".teachers-form__input")[2] ||
      row.querySelector(
        'input[placeholder*="Примечание"], input[placeholder*="примечание"]',
      );

    const value = valueInput?.value.trim();
    const note = noteInput?.value.trim();

    if (value) {
      let line = value;
      if (note) {
        line += ` (${note})`;
      }
      contactLines.push(line);
    }
  });

  // Сохраняем через \n — чисто и удобно читать
  const contacts = contactLines.length > 0 ? contactLines.join("\n") : null;

  // Примечание
  const description =
    document.querySelector(".teachers-form__textarea")?.value.trim() || null;

  // Итоговый объект — 100% соответствует твоей БД
  const data = {
    full_name: fullName,
    avatar: null, // потом можно добавить загрузку фото
    sex: sex,
    DOB: DOB,
    contacts: contacts,
    description: description,
    branches: branches,
  };
  return data;
}

export function clearTeacherForm() {
  const nameInput = document.querySelector(
    '.teachers-form__input[placeholder*="Например"]',
  );
  if (nameInput) nameInput.value = "";

  const dateInput = document.querySelector('input[type="date"]');
  if (dateInput) dateInput.value = "";

  const maleBtn = document.querySelector(
    '.teachers-form__gender-btn[data-gender="male"]',
  );
  const femaleBtn = document.querySelector(
    '.teachers-form__gender-btn[data-gender="female"]',
  );
  if (maleBtn && femaleBtn) {
    maleBtn.classList.add("teachers-form__gender-btn--active");
    femaleBtn.classList.remove("teachers-form__gender-btn--active");
  }

  const textarea = document.querySelector(".teachers-form__textarea");
  if (textarea) textarea.value = "";

  document
    .querySelectorAll('.teachers-form__checkboxes input[type="checkbox"]')
    .forEach((cb) => (cb.checked = false));

  const contactRows = document.querySelectorAll(".teachers-form__contact-row");
  contactRows.forEach((row, index) => {
    if (index === 0) {
      row.querySelector(".teachers-form__contact-value").value = "";
      const noteInput = row.querySelectorAll(".teachers-form__input")[2];
      if (noteInput) noteInput.value = "";
    } else {
      row.remove();
    }
  });

  const colorInput = document.querySelector('input[type="color"]');
  if (colorInput) colorInput.value = "#888888";

  const saveBtn = document.getElementById("saveTeacher");
  if (saveBtn) {
    saveBtn.textContent = "Сохранить";
  }
  const modalTitle = document.querySelector(".teachers-form__header");
  if (modalTitle) {
    modalTitle.innerHTML =
      "Добавить педагога<div class='teachers-form__close' id='teachersFormClose'>&times</div>";
    const teachersFormClose = document.getElementById("teachersFormClose");
    teachersFormClose.addEventListener("click", () => {
      teachersForm.classList.remove("teachers-form__active");
    });
  }
}

export function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}
