document.querySelectorAll(".teachers-form__gender-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".teachers-form__gender-btn")
      .forEach((b) => b.classList.remove("teachers-form__gender-btn--active"));
    btn.classList.add("teachers-form__gender-btn--active");
  });
});

// Добавление контакта
export function addContact() {
  const container = document.getElementById("contactsList");
  const row = document.createElement("div");
  row.className = "teachers-form__contact-row";

  row.innerHTML = `
    <select class="teachers-form__select">
      <option value="tel"   data-type="tel"   data-mask="phone">Мобильный</option>
      <option value="num"   data-type="text"   data-mask="none">Телефон</option>
      <option value="email" data-type="email" data-mask="none">E-mail</option>
      <option value="text"  data-type="text"  data-mask="none">Skype</option>
      <option value="url"   data-type="url"   data-mask="none">Ссылка</option>
      <option value="text"  data-type="text"  data-mask="none">Адрес</option>
      <option value="text"  data-type="text"  data-mask="none">Ст. метро</option>
    </select>

    <input type="tel" class="teachers-form__input teachers-form__contact-value" 
           placeholder="+375 (29) 123-45-67">

    <input type="text" class="teachers-form__input" placeholder="Примечание">

    <button type="button" class="teachers-form__contact-remove">−</button>
  `;

  const select = row.querySelector(".teachers-form__select");
  const valueInput = row.querySelector(".teachers-form__contact-value");
  const removeBtn = row.querySelector(".teachers-form__contact-remove");

  removeBtn.onclick = () => row.remove();

  // Плейсхолдеры
  const placeholders = {
    Мобильный: "+375 (29) 123-45-67",
    Телефон: "78-25-91",
    "E-mail": "example@mail.ru",
    Skype: "your_skype",
    Ссылка: "https://",
    Адрес: "г. Минск, ул. Ленина, д. 10",
    "Ст. метро": "Немига",
  };

  // === МАСКА +375 (XX) XXX-XX-XX ===
  function applyBelarusPhoneMask(e) {
    let v = valueInput.value.replace(/\D/g, ""); // только цифры

    // Убираем старый код, если ввели 375 или 8
    if (v.startsWith("375")) v = v.slice(3);
    if (v.startsWith("8")) v = v.slice(1);

    // Ограничиваем до 9 цифр после кода
    if (v.length > 9) v = v.slice(0, 9);

    // Формируем: +375 (XX) XXX-XX-XX
    let formatted = "+375 ";
    if (v.length > 0) formatted += "(" + v.slice(0, 2);
    if (v.length >= 2) formatted += ") " + v.slice(2, 5);
    if (v.length >= 5) formatted += "-" + v.slice(5, 7);
    if (v.length >= 7) formatted += "-" + v.slice(7, 9);

    valueInput.value = formatted;

    // Курсор в конец
    setTimeout(() => {
      const pos = formatted.length;
      valueInput.setSelectionRange(pos, pos);
    }, 0);
  }

  // Смена типа контакта
  select.addEventListener("change", () => {
    const option = select.options[select.selectedIndex];
    const type = option.dataset.type;
    const mask = option.dataset.mask;
    const text = option.textContent;

    valueInput.type = type;
    valueInput.placeholder = placeholders[text];
    valueInput.value = "";

    // Убираем старую маску
    valueInput.removeEventListener("input", applyBelarusPhoneMask);

    // Включаем маску только для телефона
    if (mask === "phone") {
      valueInput.addEventListener("input", applyBelarusPhoneMask);
      valueInput.focus();
    }
  });

  // Инициализация: если первый тип — телефон
  const initialOption = select.options[select.selectedIndex];
  if (initialOption.dataset.mask === "phone") {
    valueInput.addEventListener("input", applyBelarusPhoneMask);
  }

  container.appendChild(row);
}

const formAddContact = document.getElementById("formAddContact");

formAddContact.addEventListener("click", () => {
  addContact();
});

// Функция заполнения формы при редактировании
export function fillTeacherFormForEdit(teacher) {
  // ФИО
  const nameInput = document.querySelector(
    '.teachers-form__input[placeholder*="Например, Иванова Мария Ивановна"]'
  );
  if (nameInput) nameInput.value = teacher.full_name || "";

  // Пол
  const maleBtn = document.querySelector(
    '.teachers-form__gender-btn[data-gender="male"]'
  );
  const femaleBtn = document.querySelector(
    '.teachers-form__gender-btn[data-gender="female"]'
  );
  if (teacher.sex === "Мужской") {
    maleBtn?.classList.add("teachers-form__gender-btn--active");
    femaleBtn?.classList.remove("teachers-form__gender-btn--active");
  } else {
    femaleBtn?.classList.add("teachers-form__gender-btn--active");
    maleBtn?.classList.remove("teachers-form__gender-btn--active");
  }

  // Дата рождения
  const dateInput = document.querySelector('input[type="date"]');
  if (dateInput && teacher.DOB) dateInput.value = teacher.DOB;

  // Примечание
  const textarea = document.querySelector(".teachers-form__textarea");
  if (textarea) textarea.value = teacher.description || "";

  // Филиалы
  const branchNames = teacher.branches
    ? teacher.branches.split(", ").map((s) => s.trim())
    : [];
  document
    .querySelectorAll('.teachers-form__checkboxes input[type="checkbox"]')
    .forEach((cb) => {
      const labelText = cb.parentElement.textContent.trim();
      cb.checked = branchNames.includes(labelText);
    });

  if (teacher.contacts) {
    const lines = teacher.contacts
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    lines.forEach((line, index) => {
      if (index > 0) addContact(); // твоя функция добавления строки

      const row = document.querySelectorAll(".teachers-form__contact-row")[
        index
      ];
      if (!row) return;

      // Разбираем строку: "+375 (29) 123-45-67 (личный)"
      const match = line.match(/^(.+?)(?:\s+\(([^()]+)\))?\s*$/);

      let value = line.trim();
      let note = "";

      if (match) {
        value = match[1].trim();
        note = match[2] || "";
      }

      const valueInput = row.querySelector(".teachers-form__contact-value");
      const noteInput =
        row.querySelectorAll(".teachers-form__input")[2] ||
        row.querySelector('input[placeholder*="Примечание"]');

      if (valueInput) valueInput.value = value;
      if (noteInput) noteInput.value = note;

      // Тип можно оставить по умолчанию (например, "Мобильный")
    });
  }
}
