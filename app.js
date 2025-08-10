class ListManager {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('listItems')) || [];
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.render();
        
        // Register service worker for PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js', { scope: './' })
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }

    cacheElements() {
        this.form = document.getElementById('addItemForm');
        this.input = document.getElementById('newItemInput');
        this.list = document.getElementById('itemList');
        this.emptyState = document.getElementById('emptyState');
        this.filters = document.querySelectorAll('.filter-btn');
        this.clearBtn = document.getElementById('clearCompletedBtn');
        this.activeCount = document.getElementById('activeCount');
        this.completedCount = document.getElementById('completedCount');
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleAdd(e));
        this.filters.forEach(btn => btn.addEventListener('click', (e) => this.handleFilter(e)));
        this.clearBtn.addEventListener('click', () => this.handleClearCompleted());
        
        // Enable swipe-to-delete on touch devices
        this.enableSwipeDelete();
    }

    handleAdd(e) {
        e.preventDefault();
        
        const text = this.input.value.trim();
        if (!text) return;

        const newItem = {
            id: Date.now(),
            text,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.items.unshift(newItem);
        this.save();
        this.render();
        
        this.input.value = '';
        this.input.focus();
    }

    handleToggle(id) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            item.completed = !item.completed;
            this.save();
            this.render();
        }
    }

    handleDelete(id) {
        const itemEl = this.list.querySelector(`[data-id="${id}"]`);
        
        // Add removal animation
        itemEl.classList.add('removing');
        
        setTimeout(() => {
            this.items = this.items.filter(item => item.id !== id);
            this.save();
            this.render();
        }, 300);
    }

    handleFilter(e) {
        this.filters.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.render();
    }

    handleClearCompleted() {
        const completed = this.items.filter(item => item.completed);
        
        if (completed.length === 0) return;
        
        completed.forEach(item => {
            const itemEl = this.list.querySelector(`[data-id="${item.id}"]`);
            if (itemEl) {
                itemEl.classList.add('removing');
            }
        });

        setTimeout(() => {
            this.items = this.items.filter(item => !item.completed);
            this.save();
            this.render();
        }, 300);
    }

    enableSwipeDelete() {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        let currentItem = null;

        this.list.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const item = e.target.closest('.item');
            
            if (!item) return;
            
            startX = touch.clientX;
            currentItem = item;
            isDragging = true;
        });

        this.list.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentX = e.touches[0].clientX;
            const deltaX = currentX - startX;
            
            if (deltaX < -50) {
                currentItem.style.transform = `translateX(${deltaX}px)`;
                currentItem.style.opacity = 1 + (deltaX / 200);
            }
        });

        this.list.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            
            const deltaX = currentX - startX;
            
            if (deltaX < -150) {
                const id = parseInt(currentItem.dataset.id);
                this.handleDelete(id);
            } else {
                currentItem.style.transform = '';
                currentItem.style.opacity = '';
            }
            
            isDragging = false;
            currentItem = null;
        });
    }

    getFilteredItems() {
        switch (this.currentFilter) {
            case 'active':
                return this.items.filter(item => !item.completed);
            case 'completed':
                return this.items.filter(item => item.completed);
            default:
                return this.items;
        }
    }

    updateStats() {
        const active = this.items.filter(item => !item.completed).length;
        const completed = this.items.filter(item => item.completed).length;
        
        this.activeCount.textContent = active;
        this.completedCount.textContent = completed;
    }

    render() {
        const filteredItems = this.getFilteredItems();
        
        // Show/hide empty state
        if (filteredItems.length === 0) {
            this.emptyState.classList.add('show');
            this.emptyState.style.display = 'block';
        } else {
            this.emptyState.classList.remove('show');
            setTimeout(() => {
                this.emptyState.style.display = 'none';
            }, 300);
        }

        // Render items
        this.list.innerHTML = filteredItems
            .map(item => this.renderItem(item))
            .join('');

        this.updateStats();

        // Add event listeners to new elements
        this.list.querySelectorAll('.item').forEach(itemEl => {
            const checkbox = itemEl.querySelector('.checkbox');
            const deleteBtn = itemEl.querySelector('.delete-btn');
            
            checkbox.addEventListener('click', () => {
                const id = parseInt(itemEl.dataset.id);
                this.handleToggle(id);
            });
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(itemEl.dataset.id);
                this.handleDelete(id);
            });
        });
    }

    renderItem(item) {
        const checkedClass = item.completed ? 'checked' : '';
        const completedClass = item.completed ? 'completed' : '';
        
        return `
            <li class="item ${completedClass}" data-id="${item.id}" draggable="true">
                <div class="checkbox ${checkedClass}"></div>
                <div class="item-content">${this.escapeHTML(item.text)}</div>
                <button class="delete-btn" aria-label="Delete item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </li>
        `;
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    save() {
        localStorage.setItem('listItems', JSON.stringify(this.items));
    }
}

new ListManager();