// Tag Manager for OpenAPI Editor
export class TagManager {
    constructor(editor) {
        this.editor = editor;
        this.currentTagName = null;
        this.isEditing = false;
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add tag button
        document.getElementById('add-tag-btn').addEventListener('click', () => {
            this.showTagManager();
        });

        // Tag manager modal
        document.getElementById('close-tag-manager').addEventListener('click', () => {
            this.hideTagManager();
        });

        document.getElementById('save-tag-btn').addEventListener('click', () => {
            this.saveTag();
        });

        document.getElementById('cancel-tag-btn').addEventListener('click', () => {
            this.hideTagManager();
        });

        // Handle modal backdrop clicks
        document.getElementById('tag-manager-modal').addEventListener('click', (e) => {
            if (e.target.id === 'tag-manager-modal') {
                this.hideTagManager();
            }
        });

        // Close modal with ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('tag-manager-modal').style.display === 'block') {
                this.hideTagManager();
            }
        });
    }

    showTagManager(tagName = null) {
        this.currentTagName = tagName;
        this.isEditing = !!tagName;

        const modal = document.getElementById('tag-manager-modal');
        const title = document.getElementById('tag-manager-title');
        const saveBtn = document.getElementById('save-tag-btn');

        if (this.isEditing) {
            title.textContent = 'Edit Tag';
            saveBtn.textContent = 'Update Tag';
            this.loadTagData(tagName);
        } else {
            title.textContent = 'Add Tag';
            saveBtn.textContent = 'Add Tag';
            this.clearTagForm();
        }

        // Show the modal using Bootstrap classes
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');

        // Create backdrop if it doesn't exist
        if (!document.querySelector('.modal-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
        }
    } hideTagManager() {
        // Hide the modal using Bootstrap classes
        const modal = document.getElementById('tag-manager-modal');
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');

        // Remove backdrop
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }

        this.currentTagName = null;
        this.isEditing = false;
    }

    loadTagData(tagName) {
        const tag = this.editor.getTag(tagName);
        if (tag) {
            document.getElementById('tag-name').value = tag.name;
            document.getElementById('tag-description').value = tag.description || '';
        }
    }

    clearTagForm() {
        document.getElementById('tag-name').value = '';
        document.getElementById('tag-description').value = '';
    }

    saveTag() {
        const name = document.getElementById('tag-name').value.trim();
        const description = document.getElementById('tag-description').value.trim();

        if (!name) {
            alert('Tag name is required');
            return;
        }

        // Validate tag name (no special characters, spaces)
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            alert('Tag name can only contain letters, numbers, underscores, and hyphens');
            return;
        }

        try {
            if (this.isEditing) {
                this.editor.updateTag(this.currentTagName, name, description);
            } else {
                this.editor.addTag(name, description);
            } this.hideTagManager();
            this.renderTags();

            // Update tag select options in endpoint editor
            if (window.uiManager) {
                window.uiManager.updateTagSelectOptions();
            }

            // Auto-save to localStorage
            if (window.app) {
                window.app.saveToStorage();
            }

            // Refresh endpoints list to show new grouping
            if (window.uiManager) {
                window.uiManager.renderEndpoints();
            }
        } catch (error) {
            alert('Error saving tag: ' + error.message);
        }
    }

    renderTags() {
        const container = document.getElementById('tags-list');
        const tags = this.editor.getAllTags();
        const endpointsByTag = this.editor.getEndpointsByTag();

        container.innerHTML = ''; if (tags.length === 0) {
            container.innerHTML = '<p class="empty-state">No tags defined. Tags help organize your endpoints.</p>';
            return;
        }

        // Sort tags alphabetically by name
        const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name));

        sortedTags.forEach(tag => {
            const div = document.createElement('div');
            div.className = 'tag-item';

            const endpointCount = endpointsByTag.get(tag.name)?.length || 0;

            div.innerHTML = `
                <div class="tag-info">
                    <div>
                        <div class="tag-name">${tag.name}</div>
                        ${tag.description ? `<div class="tag-description">${tag.description}</div>` : ''}
                    </div>
                    <span class="tag-count">${endpointCount} endpoint${endpointCount !== 1 ? 's' : ''}</span>
                </div>
                <button type="button" class="btn btn-sm text-danger delete-tag-btn" onclick="window.tagManager.deleteTag('${tag.name}')" title="Delete tag">
                    <i class="bi bi-x-lg"></i>
                </button>
            `;

            // Add click handler to the main area (excluding the delete button)
            div.addEventListener('click', (e) => {
                // Don't open editor if delete button was clicked
                if (!e.target.closest('.delete-tag-btn')) {
                    this.showTagManager(tag.name);
                }
            });

            container.appendChild(div);
        });        // Expose globally for inline handlers
        window.tagManager = this;
    }

    deleteTag(tagName) {
        const endpointsByTag = this.editor.getEndpointsByTag();
        const endpointCount = endpointsByTag.get(tagName)?.length || 0;

        const message = endpointCount > 0
            ? `Are you sure you want to delete the tag "${tagName}"? This will remove the tag from ${endpointCount} endpoint${endpointCount !== 1 ? 's' : ''}.`
            : `Are you sure you want to delete the tag "${tagName}"?`; if (confirm(message)) {
                this.editor.deleteTag(tagName);
                this.renderTags();

                // Update tag select options in endpoint editor
                if (window.uiManager) {
                    window.uiManager.updateTagSelectOptions();
                    window.uiManager.renderEndpoints();
                }

                // Auto-save to localStorage
                if (window.app) {
                    window.app.saveToStorage();
                }
            }
    }

    updateTagSelectOptions() {
        const select = document.getElementById('endpoint-tags-select');
        const tags = this.editor.getAllTags();

        select.innerHTML = '';

        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.name;
            option.textContent = tag.name + (tag.description ? ` - ${tag.description}` : '');
            select.appendChild(option);
        });
    }
}
