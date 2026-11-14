"use strict";

const STORAGE_KEY = "habitly-data-v1";
const THEME_KEY = "habitly-theme";
const QUOTE_KEY = "habitly-previous-quote";

const quotes = [
    ["With God In Charge, I Believe Everything Will Work Out For The Best In The End.", "Henry Ford"],
    ["The secret of getting ahead is getting started.", "Mark Twain"],
    ["Believe you can and you're halfway there.", "Theodore Roosevelt"],
    ["God will not place a burden on a man's shoulders knowing that he cannot carry it.","Muhammad Ali"],
    ["Great things are done by a series of small things brought together.", "Vincent van Gogh"],
    ["A little progress each day adds up to big results.", "Unknown"],
    ["Discipline is the bridge between goals and accomplishment.", "Jim Rohn"],
    ["Every day is a new beginning. Take a deep breath and start again.", "Unknown"],
    ["It always seems impossible until it's done.", "Nelson Mandela"],
    ["Success is the sum of small efforts repeated every day.", "Robert Collier"]
];

let habits = loadHabits();
let selectedEmoji = "💧";
let currentFilter = "all";

const habitForm = document.getElementById("habitForm");
const habitInput = document.getElementById("habitInput");
const habitList = document.getElementById("habitList");
const emptyState = document.getElementById("emptyState");
const weeklyChart = document.getElementById("weeklyChart");
const formMessage = document.getElementById("formMessage");
const themeToggle = document.getElementById("themeToggle");

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function todayKey() {
    return getDateKey(new Date());
}

function dateFromKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
}

function getLastSevenDays() {
    const result = [];
    for (let i = 6; i >= 0; i--) {
        const date = dateFromKey(todayKey());
        date.setDate(date.getDate() - i);
        result.push(date);
    }
    return result;
}

function loadHabits() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!Array.isArray(saved)) return [];

        return saved
            .filter(h => h && typeof h.id === "string" && typeof h.name === "string")
            .map(h => ({
                id: h.id,
                name: h.name,
                emoji: h.emoji || "🌱",
                completedDates: Array.isArray(h.completedDates)
                    ? [...new Set(h.completedDates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))]
                    : []
            }));
    } catch (error) {
        console.error("Could not load habits:", error);
        return [];
    }
}

function saveHabits() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
        return true;
    } catch (error) {
        console.error("Could not save habits:", error);
        showMessage("Could not save changes in this browser.", true);
        return false;
    }
}

function showMessage(message, error = false) {
    formMessage.textContent = message;
    formMessage.style.color = error ? "#ef7777" : "";
}

function displayCurrentDate() {
    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        });
}

function changeQuote() {
    const previous = Number(localStorage.getItem(QUOTE_KEY));
    let index = Math.floor(Math.random() * quotes.length);

    if (quotes.length > 1 && index === previous) {
        index = (index + 1) % quotes.length;
    }

    document.getElementById("dailyQuote").textContent = `“${quotes[index][0]}”`;
    document.getElementById("quoteAuthor").textContent = `— ${quotes[index][1]}`;

    localStorage.setItem(QUOTE_KEY, String(index));
}

function addHabit(name) {
    const cleanName = name.trim();

    if (!cleanName) {
        showMessage("Please enter a habit name.", true);
        return;
    }

    if (habits.some(h => h.name.toLowerCase() === cleanName.toLowerCase())) {
        showMessage("This habit already exists.", true);
        return;
    }

    habits.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        name: cleanName,
        emoji: selectedEmoji,
        completedDates: []
    });

    saveHabits();
    habitInput.value = "";
    currentFilter = "all";
    updateFilterButtons();
    showMessage("Your new habit has been added!");
    renderApp();
    habitInput.focus();
}

habitForm.addEventListener("submit", event => {
    event.preventDefault();
    addHabit(habitInput.value);
});

document.querySelectorAll(".emoji-option").forEach(button => {
    button.addEventListener("click", () => {
        selectedEmoji = button.dataset.emoji;

        document.querySelectorAll(".emoji-option").forEach(item => {
            item.classList.remove("selected");
        });

        button.classList.add("selected");
    });
});

function isCompletedToday(habit) {
    return habit.completedDates.includes(todayKey());
}

function toggleHabit(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const today = todayKey();

    if (habit.completedDates.includes(today)) {
        habit.completedDates = habit.completedDates.filter(date => date !== today);
    } else {
        habit.completedDates.push(today);
    }

    saveHabits();
    renderApp();
}

function calculateStreak(habit) {
    const completed = new Set(habit.completedDates);
    const cursor = dateFromKey(todayKey());

    if (!completed.has(getDateKey(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;

    while (completed.has(getDateKey(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
}

function calculateBestStreak(habit) {
    const dates = [...new Set(habit.completedDates)].sort();
    let best = 0;
    let current = 0;
    let previous = null;

    dates.forEach(key => {
        const date = dateFromKey(key);

        if (previous) {
            const gap = Math.round((date - previous) / 86400000);
            current = gap === 1 ? current + 1 : 1;
        } else {
            current = 1;
        }

        best = Math.max(best, current);
        previous = date;
    });

    return best;
}

function updateStatistics() {
    const completedToday = habits.filter(isCompletedToday).length;

    const best = habits.reduce((highest, habit) => {
        return Math.max(highest, calculateBestStreak(habit));
    }, 0);

    const days = getLastSevenDays();
    let completedCount = 0;

    habits.forEach(habit => {
        days.forEach(date => {
            if (habit.completedDates.includes(getDateKey(date))) {
                completedCount++;
            }
        });
    });

    const possible = habits.length * 7;
    const percentage = possible
        ? Math.round((completedCount / possible) * 100)
        : 0;

    document.getElementById("completedCount").textContent =
        `${completedToday}/${habits.length}`;

    document.getElementById("bestStreak").textContent =
        `${best} ${best === 1 ? "Day" : "Days"}`;

    document.getElementById("weeklyProgress").textContent =
        `${percentage}%`;

    document.getElementById("habitTotal").textContent = habits.length;
}

function renderWeeklyChart() {
    weeklyChart.innerHTML = "";

    getLastSevenDays().forEach(date => {
        const key = getDateKey(date);
        const completed = habits.filter(h => h.completedDates.includes(key)).length;

        const percentage = habits.length
            ? Math.round((completed / habits.length) * 100)
            : 0;

        const day = document.createElement("div");
        day.className = "chart-day";

        if (key === todayKey()) {
            day.classList.add("today");
        }

        const percent = document.createElement("span");
        percent.className = "chart-percent";
        percent.textContent = `${percentage}%`;

        const track = document.createElement("div");
        track.className = "chart-track";
        track.title = `${completed} of ${habits.length} completed`;

        const fill = document.createElement("div");
        fill.className = "chart-fill";
        fill.style.height = `${percentage}%`;

        track.appendChild(fill);

        const name = document.createElement("span");
        name.className = "chart-name";
        name.textContent = date.toLocaleDateString("en-US", {
            weekday: "short"
        });

        day.append(percent, track, name);
        weeklyChart.appendChild(day);
    });
}

function createHabitCard(habit) {
    const card = document.createElement("article");
    card.className = "habit-card";

    const top = document.createElement("div");
    top.className = "habit-top";

    const emoji = document.createElement("div");
    emoji.className = "habit-emoji";
    emoji.textContent = habit.emoji;

    const info = document.createElement("div");

    const name = document.createElement("h3");
    name.className = "habit-name";
    name.textContent = habit.name;

    const streak = calculateStreak(habit);
    const streakText = document.createElement("p");
    streakText.className = "habit-streak";
    streakText.textContent = `🔥 ${streak} ${streak === 1 ? "day" : "days"} streak`;

    info.append(name, streakText);
    top.append(emoji, info);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Delete ${habit.name}`);
    remove.addEventListener("click", () => deleteHabit(habit.id));

    top.appendChild(remove);

    const complete = document.createElement("button");
    complete.type = "button";
    complete.className = "complete-button";

    if (isCompletedToday(habit)) {
        complete.classList.add("done");
        complete.textContent = "✓ Completed Today";
    } else {
        complete.textContent = "○ Mark as Done";
    }

    complete.addEventListener("click", () => toggleHabit(habit.id));

    card.append(top, complete);
    return card;
}

function renderHabits() {
    habitList.innerHTML = "";

    let visible = habits;

    if (currentFilter === "done") {
        visible = habits.filter(isCompletedToday);
    }

    if (currentFilter === "pending") {
        visible = habits.filter(h => !isCompletedToday(h));
    }

    visible.forEach(habit => {
        habitList.appendChild(createHabitCard(habit));
    });

    if (visible.length === 0) {
        emptyState.classList.add("show");

        if (habits.length === 0) {
            emptyState.querySelector("h3").textContent = "No habits added yet!";
            emptyState.querySelector("p").textContent =
                "Start your journey by adding your first habit.";
        } else {
            emptyState.querySelector("h3").textContent = "Nothing to show just yet!";
            emptyState.querySelector("p").textContent =
                "Try another filter to see your habits.";
        }
    } else {
        emptyState.classList.remove("show");
    }
}

function deleteHabit(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    if (!confirm(`Are you sure you want to delete "${habit.name}"?`)) {
        return;
    }

    habits = habits.filter(h => h.id !== id);
    saveHabits();
    renderApp();
}

function updateFilterButtons() {
    document.querySelectorAll(".filter-btn").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.filter === currentFilter
        );
    });
}

document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;
        updateFilterButtons();
        renderHabits();
    });
});

function setTheme(theme) {
    document.body.classList.toggle("light", theme === "light");
    themeToggle.textContent = theme === "light" ? "🌙" : "☀️";
    localStorage.setItem(THEME_KEY, theme);
}

function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    setTheme(saved === "light" ? "light" : "dark");
}

themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("light")
        ? "dark"
        : "light";

    setTheme(nextTheme);
});

function renderApp() {
    updateStatistics();
    renderWeeklyChart();
    renderHabits();
}

function initializeApp() {
    displayCurrentDate();
    changeQuote();
    loadTheme();
    updateFilterButtons();
    renderApp();
}

const resetDemoButton = document.getElementById("resetDemo");

resetDemoButton.addEventListener("click", () => {
    const confirmReset = confirm(
        "Are you sure you want to reset all demo data?"
    );

    if (confirmReset) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
});
initializeApp();
