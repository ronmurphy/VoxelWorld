/**
 * TutorialEditorModal - Opens the tutorial editor as a modal overlay in the game
 */

export class TutorialEditorModal {
    constructor() {
        this.isOpen = false;
        this.modalElement = null;
        this.iframeElement = null;
    }

    /**
     * Open the tutorial editor modal
     */
    open() {
        if (this.isOpen) {
            console.warn('Tutorial editor is already open');
            return;
        }

        this.createModal();
        this.isOpen = true;
        console.log('🎓 Tutorial Editor opened');
    }

    /**
     * Close the tutorial editor modal
     */
    close() {
        if (!this.isOpen || !this.modalElement) {
            return;
        }

        this.modalElement.remove();
        this.modalElement = null;
        this.iframeElement = null;
        this.isOpen = false;
        console.log('🎓 Tutorial Editor closed');
    }

    /**
     * Create the modal DOM structure
     */
    createModal() {
        // Create modal container
        this.modalElement = document.createElement('div');
        this.modalElement.id = 'tutorial-editor-modal';
        this.modalElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 60000;
            display: flex;
            flex-direction: column;
            padding: 20px;
        `;

        // Create header bar
        const header = document.createElement('div');
        header.style.cssText = `
            background: #252526;
            color: #cccccc;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 8px 8px 0 0;
            border-bottom: 1px solid #3e3e42;
        `;

        const title = document.createElement('h2');
        title.textContent = '🎓 Tutorial/Quest Editor';
        title.style.cssText = `
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        `;

        const closeButton = document.createElement('button');
        closeButton.textContent = '✕ Close';
        closeButton.style.cssText = `
            background: #c72e2e;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background 0.2s;
        `;
        closeButton.onmouseover = () => closeButton.style.background = '#e04141';
        closeButton.onmouseout = () => closeButton.style.background = '#c72e2e';
        closeButton.onclick = () => this.close();

        header.appendChild(title);
        header.appendChild(closeButton);

        // Create iframe container
        const iframeContainer = document.createElement('div');
        iframeContainer.style.cssText = `
            flex: 1;
            background: white;
            border-radius: 0 0 8px 8px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        `;

        // Create iframe
        this.iframeElement = document.createElement('iframe');
        this.iframeElement.src = './tutorial-editor.html';
        this.iframeElement.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
        `;

        iframeContainer.appendChild(this.iframeElement);

        // Assemble modal
        this.modalElement.appendChild(header);
        this.modalElement.appendChild(iframeContainer);

        // Add to document
        document.body.appendChild(this.modalElement);

        // Close on Escape key
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }

    /**
     * Toggle the modal open/closed
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
}
