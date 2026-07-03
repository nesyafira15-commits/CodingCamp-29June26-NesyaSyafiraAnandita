'use strict';

// ============================================================
// Storage Module
// ============================================================
const Storage = {
    get: (key, defaultValue) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Storage error:', e);
        }
    }
};

// ============================================================
// Theme Module
// ============================================================
const Theme = {
    init() {
        const savedTheme = Storage.get('theme', 'light');
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateButtonIcon(savedTheme);

        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
    },
    toggle() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        Storage.set('theme', next);
        this.updateButtonIcon(next);
    },
    updateButtonIcon(theme) {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }
};

// ============================================================
// Greeting Widget
// ============================================================
const GreetingWidget = {
    init() {
        this.elTime = document.getElementById('greeting-time');
        this.elDate = document.getElementById('greeting-date');
        this.elText = document.getElementById('greeting-text');

        if (this.elTime && this.elDate && this.elText) {
            this.update();
            setInterval(() => this.update(), 1000);
        }
    },
    update() {
        const now = new Date();
        const name = Storage.get('userName', '').trim();
        const nameSuffix = name ? `, ${name}` : '';

        // Update Waktu
        this.elTime.textContent = now.toLocaleTimeString('en-US', { hour12: false });

        // Update Tanggal
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        this.elDate.textContent = now.toLocaleDateString('en-US', options);

        // Update Greeting Text
        const hours = now.getHours();
        let greeting = 'Good Night';
        if (hours >= 5 && hours < 12) greeting = 'Good Morning';
        else if (hours >= 12 && hours < 17) greeting = 'Good Afternoon';
        else if (hours >= 17 && hours < 21) greeting = 'Good Evening';

        this.elText.textContent = `${greeting}${nameSuffix}`;
    }
};

// ============================================================
// Focus Timer
// ============================================================
const FocusTimer = {
    duration: 25, // default menit
    timeLeft: 1500, // default detik (25 * 60)
    timerId: null,

    init() {
        this.duration = Storage.get('timerDuration', 25);
        this.timeLeft = this.duration * 60;

        this.elDisplay = document.getElementById('timer-display');
        this.elNotification = document.getElementById('timer-notification');
        this.elStart = document.getElementById('timer-start');
        this.elStop = document.getElementById('timer-stop');
        this.elReset = document.getElementById('timer-reset');

        if (this.elStart) this.elStart.addEventListener('click', () => this.start());
        if (this.elStop) this.elStop.addEventListener('click', () => this.stop());
        if (this.elReset) this.elReset.addEventListener('click', () => this.reset());

        this.render();
    },
    start() {
        if (this.timerId) return;
        this.elStart.disabled = true;
        this.elStop.disabled = false;

        this.timerId = setInterval(() => {
            if (this.timeLeft > 0) {
                this.timeLeft--;
                this.render();
            } else {
                this.complete();
            }
        }, 1000);
    },
    stop() {
        if (!this.timerId) return;
        clearInterval(this.timerId);
        this.timerId = null;
        this.elStart.disabled = false;
        this.elStop.disabled = true;
    },
    reset() {
        this.stop();
        this.duration = Storage.get('timerDuration', 25);
        this.timeLeft = this.duration * 60;
        this.render();
        if (this.elNotification) this.elNotification.hidden = true;
    },
    complete() {
        this.stop();
        if (this.elNotification) {
            this.elNotification.textContent = "Focus session finished! Take a break.";
            this.elNotification.hidden = false;
        }
        Utils.showToast("🔔 Focus session completed!");
        this.timeLeft = this.duration * 60;
        this.render();
    },
    updateDuration(newMinutes) {
        this.duration = newMinutes;
        Storage.set('timerDuration', newMinutes);
        this.reset();
    },
    render() {
        const mins = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
        const secs = (this.timeLeft % 60).toString().padStart(2, '0');
        if (this.elDisplay) this.elDisplay.textContent = `${mins}:${secs}`;
    }
};

// ============================================================
// Task List
// ============================================================
const TaskList = {
    tasks: [],
    init() {
        this.tasks = Storage.get('tasks', []);
        this.elInput = document.getElementById('task-input');
        this.elAddBtn = document.getElementById('task-add');
        this.elList = document.getElementById('task-list');
        this.elEmpty = document.getElementById('task-empty');
        this.elSort = document.getElementById('task-sort');
        this.elError = document.getElementById('task-input-error');

        if (this.elAddBtn) this.elAddBtn.addEventListener('click', () => this.add());
        if (this.elInput) {
            this.elInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.add();
            });
        }
        if (this.elSort) {
            this.elSort.addEventListener('change', () => this.render());
        }

        this.render();
    },
    add() {
        const text = this.elInput.value.trim();
        if (!text) {
            this.elError.textContent = "Task cannot be empty.";
            return;
        }
        this.elError.textContent = "";
        
        this.tasks.push({
            id: Date.now().toString(),
            text: text,
            completed: false,
            createdAt: new Date().getTime()
        });
        
        Storage.set('tasks', this.tasks);
        this.elInput.value = '';
        this.render();
    },
    toggle(id) {
        this.tasks = this.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        Storage.set('tasks', this.tasks);
        this.render();
    },
    delete(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        Storage.set('tasks', this.tasks);
        this.render();
    },
    getSortedTasks() {
        const sortBy = this.elSort ? this.elSort.value : 'creation';
        const tasksCopy = [...this.tasks];

        if (sortBy === 'alpha-asc') {
            return tasksCopy.sort((a, b) => a.text.localeCompare(b.text));
        } else if (sortBy === 'alpha-desc') {
            return tasksCopy.sort((a, b) => b.text.localeCompare(a.text));
        } else if (sortBy === 'completed-first') {
            return tasksCopy.sort((a, b) => b.completed - a.completed);
        } else if (sortBy === 'completed-last') {
            return tasksCopy.sort((a, b) => a.completed - b.completed);
        }
        return tasksCopy; // default creation order
    },
    render() {
        if (!this.elList) return;
        this.elList.innerHTML = '';
        const sorted = this.getSortedTasks();

        if (sorted.length === 0) {
            if (this.elEmpty) this.elEmpty.hidden = false;
            return;
        }
        if (this.elEmpty) this.elEmpty.hidden = true;

        sorted.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'task-item--completed' : ''}`;
            li.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''} aria-label="Mark task as done">
                <span class="task-text">${Utils.escapeHtml(task.text)}</span>
                <button class="btn btn--danger btn--sm" type="button">Delete</button>
            `;

            // Event Listeners
            li.querySelector('input').addEventListener('change', () => this.toggle(task.id));
            li.querySelector('button').addEventListener('click', () => this.delete(task.id));

            this.elList.appendChild(li);
        });
    }
};

// ============================================================
// Quick Links
// ============================================================
const QuickLinks = {
    links: [],
    init() {
        this.links = Storage.get('quickLinks', []);
        this.elLabelInput = document.getElementById('link-label-input');
        this.elUrlInput = document.getElementById('link-url-input');
        this.elAddBtn = document.getElementById('link-add');
        this.elContainer = document.getElementById('links-container');
        this.elEmpty = document.getElementById('links-empty');
        this.elLabelError = document.getElementById('link-label-error');
        this.elUrlError = document.getElementById('link-url-error');

        if (this.elAddBtn) this.elAddBtn.addEventListener('click', () => this.add());

        this.render();
    },
    add() {
        const label = this.elLabelInput.value.trim();
        const url = this.elUrlInput.value.trim();
        let isValid = true;

        if (!label) {
            this.elLabelError.textContent = "Label is required.";
            isValid = false;
        } else {
            this.elLabelError.textContent = "";
        }

        if (!url || !url.startsWith('http')) {
            this.elUrlError.textContent = "Please enter a valid URL (starting with http:// or https://).";
            isValid = false;
        } else {
            this.elUrlError.textContent = "";
        }

        if (!isValid) return;

        this.links.push({ id: Date.now().toString(), label, url });
        Storage.set('quickLinks', this.links);

        this.elLabelInput.value = '';
        this.elUrlInput.value = '';
        this.render();
    },
    delete(id) {
        this.links = this.links.filter(l => l.id !== id);
        Storage.set('quickLinks', this.links);
        this.render();
    },
    render() {
        if (!this.elContainer) return;
        this.elContainer.innerHTML = '';

        if (this.links.length === 0) {
            if (this.elEmpty) this.elEmpty.hidden = false;
            return;
        }
        if (this.elEmpty) this.elEmpty.hidden = true;

        this.links.forEach(link => {
            const wrapper = document.createElement('div');
            wrapper.className = 'link-item-wrapper';
            wrapper.innerHTML = `
                <a href="${Utils.escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="btn btn--secondary link-btn">
                    ${Utils.escapeHtml(link.label)}
                </a>
                <button class="btn-link-delete" aria-label="Delete link">×</button>
            `;

            wrapper.querySelector('.btn-link-delete').addEventListener('click', () => this.delete(link.id));
            this.elContainer.appendChild(wrapper);
        });
    }
};

// ============================================================
// Settings Panel
// ============================================================
const SettingsPanel = {
    init() {
        this.elPanel = document.getElementById('settings-panel');
        this.elOpenBtn = document.getElementById('settings-open');
        this.elCloseBtn = document.getElementById('settings-close');
        this.elSaveBtn = document.getElementById('settings-save');
        this.elCancelBtn = document.getElementById('settings-cancel');

        this.inputName = document.getElementById('settings-name');
        this.inputDuration = document.getElementById('settings-duration');
        this.errorName = document.getElementById('settings-name-error');
        this.errorDuration = document.getElementById('settings-duration-error');

        if (this.elOpenBtn) this.elOpenBtn.addEventListener('click', () => this.open());
        if (this.elCloseBtn) this.elCloseBtn.addEventListener('click', () => this.close());
        if (this.elCancelBtn) this.elCancelBtn.addEventListener('click', () => this.close());
        if (this.elSaveBtn) this.elSaveBtn.addEventListener('click', () => this.save());
    },
    open() {
        if (!this.elPanel) return;
        this.inputName.value = Storage.get('userName', '');
        this.inputDuration.value = Storage.get('timerDuration', 25);
        
        this.errorName.textContent = "";
        this.errorDuration.textContent = "";
        this.elPanel.hidden = false;
    },
    close() {
        if (this.elPanel) this.elPanel.hidden = true;
    },
    save() {
        const name = this.inputName.value.trim();
        const duration = parseInt(this.inputDuration.value, 10);
        let isValid = true;

        if (isNaN(duration) || duration < 1 || duration > 120) {
            this.errorDuration.textContent = "Duration must be between 1 and 120 minutes.";
            isValid = false;
        } else {
            this.errorDuration.textContent = "";
        }

        if (!isValid) return;

        Storage.set('userName', name);
        FocusTimer.updateDuration(duration);
        GreetingWidget.update();

        Utils.showToast("Settings saved successfully!");
        this.close();
    }
};

// ============================================================
// Utilities
// ============================================================
const Utils = {
    escapeHtml(str) {
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    },
    showToast(message) {
        const area = document.getElementById('notification-area');
        if (!area) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        area.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

// ============================================================
// Bootstrap (Initialization)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    Theme.init();
    GreetingWidget.init();
    FocusTimer.init();
    TaskList.init();
    QuickLinks.init();
    SettingsPanel.init();
    console.log('Dashboard core successfully synchronized and loaded.');
});