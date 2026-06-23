'use strict';

let habbits = [];
const HABBIT_KEY = 'HABBIT_KEY';
let globalActiveHabbitId;
let editingHabbitId = null; // Переменная для хранения id редактируемой привычки
let activeFilter = 'all'; // Фильтр по категориям

/* page */
const page = {
  menu: document.querySelector('.menu__list'),
  header: {
    h1: document.querySelector('.h1'),
    progressPercent: document.querySelector('.progress__percent'),
    progressCoverBar: document.querySelector('.progress__cover-bar'),
  },
  content: {
    daysContainer: document.getElementById('days'),
    nextDay: document.querySelector('.habbit__day'),
  },
  popup: {
    index: document.getElementById('add-habbit-popup'),
    iconField: document.querySelector('.popup__form input[name="icon"]'),
    categoryField: document.querySelector(
      '.popup__form input[name="category"]',
    ), // ← Добавили
  },
};

/* utils */
/**
 * Загружает данные. Если в localStorage пусто, пытается загрузить демо-данные.
 * Теперь эта функция асинхронная (async), так как использует fetch.
 */
async function loadData() {
  const habbitsString = localStorage.getItem('HABBIT_KEY');
  
  if (!habbitsString) {
    console.log('Данные в localStorage не найдены. Пробуем загрузить демо-данные...');
    try {
      // Пытаемся скачать файл demo.json
      const response = await fetch('data/demo.json');
      
      if (response.ok) {
        const demoData = await response.json();
        habbits = demoData;
        saveData(); // Сразу сохраняем в localStorage, чтобы не грузить файл каждый раз
        console.log('✅ Демо-данные успешно загружены!');
      } else {
        console.log('Файл demo.json не найден. Запускаем пустое приложение.');
        habbits = [];
      }
    } catch (error) {
      console.error('Ошибка загрузки демо-данных:', error);
      habbits = [];
    }
    return;
  }
  
  // Если данные в localStorage ЕСТЬ (старая логика)
  const habbitArray = JSON.parse(habbitsString);
  if (Array.isArray(habbitArray)) {
    habbits = habbitArray;
  } else {
    habbits = [];
  }
}

function saveData() {
  localStorage.setItem(HABBIT_KEY, JSON.stringify(habbits));
}

function togglePopup() {
  if (page.popup.index.classList.contains('cover_hidden')) {
    page.popup.index.classList.remove('cover_hidden');
  } else {
    page.popup.index.classList.add('cover_hidden');
    // Сбрасываем режим редактирования при закрытии
    if (editingHabbitId) {
      editingHabbitId = null;
      document.querySelector('.popup h2').textContent = 'Новая привычка';
      document.querySelector('.popup__form button').textContent = 'Добавить';
      resetForm(document.getElementById('add-habbit-form'), ['name', 'target']);
    }
  }
}

function resetForm(form, fields) {
  for (const field of fields) {
    form[field].value = '';
  }
}

function validateAndGetFormData(form, fields) {
  const formData = new FormData(form);
  const res = {};
  for (const field of fields) {
    const fieldValue = formData.get(field);
    form[field].classList.remove('error');
    if (!fieldValue) {
      form[field].classList.add('error');
    }
    res[field] = fieldValue;
  }
  let isValid = true;
  for (const field of fields) {
    if (!res[field]) {
      isValid = false;
    }
  }
  if (!isValid) {
    return;
  }
  return res;
}

/* render */
function rerenderMenu(activeHabbit) {
  for (const habbit of habbits) {
    const existed = document.querySelector(`[menu-habbit-id="${habbit.id}"]`);
    if (!existed) {
      const element = document.createElement('div');
      element.classList.add('menu__item-wrapper');
      element.setAttribute('menu-habbit-id', habbit.id);

      const button = document.createElement('button');
      button.classList.add('menu__item');
      button.setAttribute('data-category', habbit.category || 'other');
      if (activeHabbit.id === habbit.id) {
        button.classList.add('menu__item_active');
      }
      button.addEventListener('click', () => rerender(habbit.id));
      button.innerHTML = `<img src="./images/${habbit.icon}.svg" alt="${habbit.name}" />`;

      // Кнопка редактирования
      const editBtn = document.createElement('button');
      editBtn.classList.add('menu__edit');
      editBtn.innerHTML = '✏️';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editHabbit(habbit.id);
      });

      // Кнопка удаления
      const deleteBtn = document.createElement('button');
      deleteBtn.classList.add('menu__delete');
      deleteBtn.innerHTML = '×';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteHabbit(habbit.id);
      });

      element.appendChild(button);
      element.appendChild(editBtn);
      element.appendChild(deleteBtn);
      page.menu.appendChild(element);
      // Применяем фильтр при создании
      if (activeFilter !== 'all' && habbit.category !== activeFilter) {
        element.classList.add('habbit_hidden');
      }
      continue;
    }
    if (activeHabbit.id === habbit.id) {
      existed.querySelector('.menu__item').classList.add('menu__item_active');
    } else {
      existed
        .querySelector('.menu__item')
        .classList.remove('menu__item_active');
    }
  }
}

function rerenderHead(activeHabbit) {
  page.header.h1.innerHTML = activeHabbit.name;
  const progress =
    activeHabbit.days.length / activeHabbit.target > 1
      ? 100
      : (activeHabbit.days.length / activeHabbit.target) * 100;
  page.header.progressPercent.innerText = progress.toFixed(0) + '%';
  page.header.progressCoverBar.setAttribute('style', `width: ${progress}%`);
}

function rerenderContent(activeHabbit) {
  page.content.daysContainer.innerHTML = '';
  for (const index in activeHabbit.days) {
    const element = document.createElement('div');
    element.classList.add('habbit');
    element.innerHTML = `<div class="habbit__day">День ${Number(index) + 1}</div>
                        <div class="habbit__comment">${activeHabbit.days[index].comment}</div>
                        <div class="habbit__actions">
                            <button class="habbit__edit" data-day-index="${index}">✏️</button>
                            <button class="habbit__delete" data-day-index="${index}">
                                <img src="./images/delete.svg" alt="Удалить день ${Number(index) + 1}" />
                            </button>
                        </div>`;
    page.content.daysContainer.appendChild(element);
  }
  page.content.nextDay.innerHTML = `День ${activeHabbit.days.length + 1}`;

  // Добавляем обработчики для кнопок удаления дней
  document.querySelectorAll('.habbit__delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dayIndex = Number(btn.dataset.dayIndex);
      deleteDay(dayIndex);
    });
  });
  // Добавляем обработчики для кнопок редактирования дней
  document.querySelectorAll('.habbit__edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dayIndex = Number(btn.dataset.dayIndex);
      editComment(globalActiveHabbitId, dayIndex);
    });
  });
}

function rerender(activeHabbitId) {
  globalActiveHabbitId = activeHabbitId;
  const activeHabbit = habbits.find((habbit) => habbit.id === activeHabbitId);
  if (!activeHabbit) {
    return;
  }
  document.location.replace(document.location.pathname + '#' + activeHabbitId);
  rerenderMenu(activeHabbit);
  rerenderHead(activeHabbit);
  rerenderContent(activeHabbit);
}

/* work with days */
function addDays(event) {
  event.preventDefault();
  const data = validateAndGetFormData(event.target, ['comment']);
  if (!data) {
    return;
  }
  habbits = habbits.map((habbit) => {
    if (habbit.id === globalActiveHabbitId) {
      return {
        ...habbit,
        days: habbit.days.concat([{ comment: data.comment }]),
      };
    }
    return habbit;
  });
  resetForm(event.target, ['comment']);
  rerender(globalActiveHabbitId);
  saveData();
}

function deleteDay(index) {
  habbits = habbits.map((habbit) => {
    if (habbit.id === globalActiveHabbitId) {
      habbit.days.splice(index, 1);
      return {
        ...habbit,
        days: habbit.days,
      };
    }
    return habbit;
  });
  rerender(globalActiveHabbitId);
  saveData();
}

/* working with habbits */
function setIcon(context, icon) {
  page.popup.iconField.value = icon;
  const activeIcon = document.querySelector('.icon.icon_active');
  activeIcon.classList.remove('icon_active');
  context.classList.add('icon_active');
}

function setCategory(context, category) {
  page.popup.categoryField.value = category;
  const activeCategory = document.querySelector('.category.category_active');
  if (activeCategory) {
    activeCategory.classList.remove('category_active');
  }
  context.classList.add('category_active');
}

function applyFilter(category) {
  // Обновляем активную кнопку фильтра
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.classList.remove('filter-btn_active');
    if (btn.dataset.filter === category) {
      btn.classList.add('filter-btn_active');
    }
  });

  // Показываем/скрываем привычки в меню
  document.querySelectorAll('.menu__item-wrapper').forEach((wrapper) => {
    const habbitId = Number(wrapper.getAttribute('menu-habbit-id'));
    const habbit = habbits.find((h) => h.id === habbitId);

    if (habbit) {
      if (category === 'all' || habbit.category === category) {
        wrapper.classList.remove('habbit_hidden');
      } else {
        wrapper.classList.add('habbit_hidden');
      }
    }
  });
}

function addHabbit(event) {
  event.preventDefault();
  const data = validateAndGetFormData(event.target, [
    'name',
    'icon',
    'target',
    'category',
  ]);
  if (!data) {
    return;
  }

  if (editingHabbitId) {
    // Режим редактирования
    const editedId = editingHabbitId; // ← Сохраняем id ПЕРЕД сбросом
    habbits = habbits.map((habbit) => {
      if (habbit.id === editingHabbitId) {
        return {
          ...habbit,
          name: data.name,
          icon: data.icon,
          category: data.category, // ← Добавили
          target: Number(data.target),
        };
      }
      return habbit;
    });
    editingHabbitId = null;

    document.querySelector('.popup h2').textContent = 'Новая привычка';
    document.querySelector('.popup__form button').textContent = 'Добавить';

    resetForm(event.target, ['name', 'target']);
    togglePopup();
    saveData();
    rerender(editedId); // ← Используем сохранённый id
  } else {
    // Режим создания
    const maxId = habbits.reduce(
      (acc, habbit) => (acc > habbit.id ? acc : habbit.id),
      0,
    );
    habbits.push({
      id: maxId + 1,
      name: data.name,
      target: Number(data.target),
      icon: data.icon,
      category: data.category, // ← Добавили
      days: [],
    });

    resetForm(event.target, ['name', 'target']);
    togglePopup();
    saveData();
    rerender(maxId + 1);
  }
}

function deleteHabbit(id) {
  const modal = document.getElementById('confirm-modal');
  const cancelBtn = document.getElementById('confirm-cancel');
  const confirmBtn = document.getElementById('confirm-ok');

  // Показываем модальное окно
  modal.classList.remove('cover_hidden');

  // Функция для закрытия модального окна
  const closeModal = () => {
    modal.classList.add('cover_hidden');
    // Удаляем обработчики после закрытия
    cancelBtn.removeEventListener('click', onCancel);
    confirmBtn.removeEventListener('click', onConfirm);
  };

  // Обработчик кнопки "Отмена"
  const onCancel = () => {
    closeModal();
  };

  // Обработчик кнопки "Удалить"
  const onConfirm = () => {
    closeModal();

    habbits = habbits.filter((habbit) => habbit.id !== id);
    saveData();

    if (habbits.length > 0) {
      rerender(habbits[0].id);
    } else {
      history.replaceState(null, null, ' ');
      page.menu.innerHTML = '';
      page.header.h1.innerHTML = '-';
      page.header.progressPercent.innerHTML = '0%';
      page.header.progressCoverBar.setAttribute('style', 'width: 0%');
      page.content.daysContainer.innerHTML = '';
      page.content.nextDay.innerHTML = 'День _';
    }
  };

  // Добавляем обработчики
  cancelBtn.addEventListener('click', onCancel);
  confirmBtn.addEventListener('click', onConfirm);

  // Закрытие по клику на фон
  modal.addEventListener(
    'click',
    (event) => {
      if (event.target === modal) {
        closeModal();
      }
    },
    { once: true },
  );
}

function editHabbit(id) {
  const habbit = habbits.find((h) => h.id === id);
  if (!habbit) return;

  editingHabbitId = id;

  // Заполняем форму данными привычки
  const form = document.getElementById('add-habbit-form');
  form.name.value = habbit.name;
  form.icon.value = habbit.icon;
  form.category.value = habbit.category; // ← Добавили!
  form.target.value = habbit.target;

  // Обновляем заголовок и кнопку
  document.querySelector('.popup h2').textContent = 'Редактировать привычку';
  document.querySelector('.popup__form button').textContent = 'Сохранить';

  // Выделяем правильную иконку
  document.querySelectorAll('.icon-select .icon').forEach((iconBtn) => {
    iconBtn.classList.remove('icon_active');
    if (iconBtn.dataset.icon === habbit.icon) {
      iconBtn.classList.add('icon_active');
    }
  });

  // Выделяем правильную категорию ← Добавили этот блок
  document.querySelectorAll('.category-select .category').forEach((catBtn) => {
    catBtn.classList.remove('category_active');
    if (catBtn.dataset.category === habbit.category) {
      catBtn.classList.add('category_active');
    }
  });

  // Открываем попап
  togglePopup();
}

/* работа с файлами (экспорт/импорт) */
function exportData() {
  // Превращаем массив привычек в красивую JSON-строку
  const dataStr = JSON.stringify(habbits, null, 2);

  // Создаем "виртуальный" файл
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Создаем невидимую ссылку и "кликаем" по ней
  const a = document.createElement('a');
  a.href = url;
  // Имя файла с текущей датой
  a.download = `habbits_backup_${new Date().toISOString().slice(0, 10)}.json`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url); // Очищаем память
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      // Пытаемся прочитать JSON
      const importedData = JSON.parse(e.target.result);

      // Проверяем, что это массив
      if (Array.isArray(importedData)) {
        habbits = importedData;
        saveData();

        // Обновляем интерфейс
        if (habbits.length > 0) {
          rerender(habbits[0].id);
        } else {
          page.menu.innerHTML = '';
          page.header.h1.innerHTML = '-';
          page.header.progressPercent.innerHTML = '0%';
          page.header.progressCoverBar.setAttribute('style', 'width: 0%');
          page.content.daysContainer.innerHTML = '';
          page.content.nextDay.innerHTML = 'День _';
        }

        alert('✅ Данные успешно импортированы!');
      } else {
        alert('❌ Ошибка: файл содержит не массив данных!');
      }
    } catch (error) {
      alert('❌ Ошибка чтения файла! Убедитесь, что это корректный JSON.');
    }

    // Сбрасываем значение инпута, чтобы можно было загрузить тот же файл повторно
    event.target.value = '';
  };

  reader.readAsText(file);
}

/* статистика */
function calculateStats() {
  let totalHabits = habbits.length;
  let totalDays = 0;
  let totalTarget = 0;

  habbits.forEach((habbit) => {
    totalDays += habbit.days.length;
    totalTarget += habbit.target;
  });

  let globalProgress = totalTarget > 0 ? (totalDays / totalTarget) * 100 : 0;

  return { totalHabits, totalDays, globalProgress };
}

function renderStats() {
  const stats = calculateStats();

  // Обновляем карточки
  document.getElementById('stat-habits-count').textContent = stats.totalHabits;
  document.getElementById('stat-days-count').textContent = stats.totalDays;
  document.getElementById('stat-progress').textContent =
    stats.globalProgress.toFixed(1) + '%';

  // Обновляем список
  const listContainer = document.getElementById('stats-list');
  listContainer.innerHTML = '';

  habbits.forEach((habbit) => {
    const progress =
      habbit.target > 0 ? (habbit.days.length / habbit.target) * 100 : 0;
    const percentStr = progress.toFixed(0) + '%';

    const item = document.createElement('div');
    item.classList.add('stats-item');
    item.innerHTML = `
      <img class="stats-item-icon" src="./images/${habbit.icon}.svg" alt="${habbit.name}">
      <div class="stats-item-info">
        <div class="stats-item-name">${habbit.name}</div>
        <div class="stats-progress-bar">
          <div class="stats-progress-fill" style="width: ${percentStr}"></div>
        </div>
      </div>
      <div class="stats-item-percent">${percentStr}</div>
    `;
    listContainer.appendChild(item);
  });

  // Открываем модальное окно
  document.getElementById('stats-modal').classList.remove('cover_hidden');
}

function closeStatsModal() {
  document.getElementById('stats-modal').classList.add('cover_hidden');
}

/* ===== Редактирование комментария ===== */
let editingCommentData = null; // Для хранения id привычки и индекса дня

function editComment(habbitId, dayIndex) {
  const habbit = habbits.find((h) => h.id === habbitId);
  if (!habbit || !habbit.days[dayIndex]) return;

  editingCommentData = { habbitId, dayIndex };

  // Заполняем форму текущим комментарием
  const form = document.getElementById('edit-comment-form');
  form.comment.value = habbit.days[dayIndex].comment;
  form.comment.classList.remove('error');

  // Открываем попап
  document
    .getElementById('edit-comment-popup')
    .classList.remove('cover_hidden');
}

function saveComment(event) {
  event.preventDefault();
  if (!editingCommentData) return;

  const form = event.target;
  const newComment = form.comment.value.trim();

  // Проверка на пустой комментарий
  if (!newComment) {
    form.comment.classList.add('error');
    return;
  }
  form.comment.classList.remove('error');

  const { habbitId, dayIndex } = editingCommentData;

  // Обновляем массив привычек
  habbits = habbits.map((habbit) => {
    if (habbit.id === habbitId) {
      const updatedDays = [...habbit.days]; // Создаем копию массива дней
      updatedDays[dayIndex] = { comment: newComment }; // Обновляем нужный день
      return { ...habbit, days: updatedDays };
    }
    return habbit;
  });

  saveData();
  rerender(habbitId);
  closeEditPopup();
}

function closeEditPopup() {
  document.getElementById('edit-comment-popup').classList.add('cover_hidden');
  editingCommentData = null;
  resetForm(document.getElementById('edit-comment-form'), ['comment']);
}

/* init */
(async () => {
  await loadData(); // <--- Теперь ждем загрузки данных

  // Обработчики для кнопок открытия/закрытия попапа
  document
    .getElementById('add-habbit-btn')
    .addEventListener('click', togglePopup);
  document
    .getElementById('close-popup-btn')
    .addEventListener('click', togglePopup);

  // Закрытие попапа при клике на тёмный фон (оверлей)
  page.popup.index.addEventListener('click', (event) => {
    if (event.target === page.popup.index) {
      togglePopup();
    }
  });

  // Обработчики для форм
  document.getElementById('add-day-form').addEventListener('submit', addDays);
  document
    .getElementById('add-habbit-form')
    .addEventListener('submit', addHabbit);

  // Обработчики для кнопок выбора иконки
  document.querySelectorAll('.icon-select .icon').forEach((iconBtn) => {
    iconBtn.addEventListener('click', () => {
      const icon = iconBtn.dataset.icon;
      setIcon(iconBtn, icon);
    });
  });

  // Инициализация приложения
  const hashId = Number(document.location.hash.replace('#', ''));
  const urlHabbit = habbits.find((habbit) => habbit.id === hashId);

  if (urlHabbit) {
    rerender(urlHabbit.id);
  } else if (habbits.length > 0) {
    rerender(habbits[0].id);
  }

  // ===== Переключатель темы =====
  const themeToggleBtn = document.getElementById('theme-toggle');
  const body = document.body;

  // Загружаем сохранённую тему
  const savedTheme = localStorage.getItem('THEME');
  if (savedTheme === 'dark') {
    body.classList.add('dark-theme');
    themeToggleBtn.textContent = '☀️';
  } else {
    // ✅ Добавляем иконку для светлой темы по умолчанию
    themeToggleBtn.textContent = '🌙';
  }

  // Обработчик клика
  themeToggleBtn.addEventListener('click', () => {
    body.classList.toggle('dark-theme');

    // Меняем иконку и сохраняем тему
    if (body.classList.contains('dark-theme')) {
      themeToggleBtn.textContent = '☀️';
      localStorage.setItem('THEME', 'dark');
    } else {
      themeToggleBtn.textContent = '🌙';
      localStorage.setItem('THEME', 'light');
    }
  });

  // ===== Обработчики экспорта и импорта =====
  document.getElementById('export-btn').addEventListener('click', exportData);

  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');

  importBtn.addEventListener('click', () => {
    importFile.click(); // Имитируем клик по скрытому полю выбора файла
  });

  importFile.addEventListener('change', importData);

  // ===== Обработчики статистики =====
  document.getElementById('stats-btn').addEventListener('click', () => {
    renderStats();
  });

  document
    .getElementById('stats-close-btn')
    .addEventListener('click', closeStatsModal);

  // Закрытие статистики по клику на фон
  document.getElementById('stats-modal').addEventListener('click', (event) => {
    if (event.target === document.getElementById('stats-modal')) {
      closeStatsModal();
    }
  });
  // ===== Обработчики редактирования комментария =====
  document
    .getElementById('edit-comment-form')
    .addEventListener('submit', saveComment);
  document
    .getElementById('close-edit-popup-btn')
    .addEventListener('click', closeEditPopup);
  document
    .getElementById('cancel-edit-btn')
    .addEventListener('click', closeEditPopup);

  // Закрытие по клику на тёмный фон
  document
    .getElementById('edit-comment-popup')
    .addEventListener('click', (event) => {
      if (event.target === document.getElementById('edit-comment-popup')) {
        closeEditPopup();
      }
    });

  // ===== Категории и фильтрация =====
  // activeFilter уже объявлен в начале файла

  // Обработчики для кнопок выбора категории в попапе
  document.querySelectorAll('.category-select .category').forEach((catBtn) => {
    catBtn.addEventListener('click', () => {
      const category = catBtn.dataset.category;
      setCategory(catBtn, category);
    });
  });

  // Обработчики для кнопок фильтра в меню
  document.querySelectorAll('.filter-btn').forEach((filterBtn) => {
    filterBtn.addEventListener('click', () => {
      activeFilter = filterBtn.dataset.filter;
      applyFilter(activeFilter);
    });
  });
})();
