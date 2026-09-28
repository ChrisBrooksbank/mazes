import type { ViewMode } from '../state';
import type { GeneratorName } from '../generators/index';
import type { SolverName } from '../solvers/index';
import { generatorNames } from '../generators/index';
import { solverNames } from '../solvers/index';

export interface ToolbarOptions {
    onGenerate: (generatorName: GeneratorName, rows: number, cols: number) => void;
    onSolve: (solverName: SolverName) => void;
    onViewChange: (mode: ViewMode) => void;
}

const VIEW_MODES: { mode: ViewMode; label: string }[] = [
    { mode: 'top-down', label: 'Top' },
    { mode: 'isometric', label: 'Iso' },
    { mode: 'first-person', label: '1st' },
    { mode: 'third-person', label: '3rd' },
];

const GENERATOR_LABELS: Record<GeneratorName, string> = {
    'recursive-backtracker': 'Recursive Backtracker',
    prims: "Prim's",
    kruskals: "Kruskal's",
};

const SOLVER_LABELS: Record<SolverName, string> = {
    bfs: 'BFS',
    dfs: 'DFS',
    astar: 'A*',
    'wall-follower': 'Wall Follower',
};

/**
 * Toolbar UI component with algorithm pickers, size controls,
 * generate/solve buttons, and view mode toggles.
 * Collapses to a hamburger menu on screens < 640px.
 */
export class Toolbar {
    private nav: HTMLElement;
    private hamburger: HTMLButtonElement;
    private menu: HTMLElement;
    private generatorSelect: HTMLSelectElement;
    private solverSelect: HTMLSelectElement;
    private rowsInput: HTMLInputElement;
    private colsInput: HTMLInputElement;
    private generateBtn: HTMLButtonElement;
    private solveBtn: HTMLButtonElement;
    private viewButtons: Map<ViewMode, HTMLButtonElement> = new Map();

    private options: ToolbarOptions;

    private boundHamburgerClick: () => void;
    private boundGenerateClick: () => void;
    private boundSolveClick: () => void;
    private boundDocumentClick: (e: MouseEvent) => void;

    constructor(options: ToolbarOptions) {
        this.options = options;

        this.nav = document.createElement('nav');
        this.nav.className = 'toolbar';
        this.nav.setAttribute('aria-label', 'Maze controls');

        this.hamburger = document.createElement('button');
        this.hamburger.className = 'toolbar__hamburger';
        this.hamburger.setAttribute('aria-label', 'Toggle menu');
        this.hamburger.setAttribute('aria-expanded', 'false');
        this.hamburger.textContent = '☰';

        this.menu = document.createElement('div');
        this.menu.className = 'toolbar__menu';

        // Generator group
        this.generatorSelect = this.buildSelect(
            'generator',
            'Generator',
            generatorNames.map(n => ({ value: n, label: GENERATOR_LABELS[n] }))
        );

        // Size controls
        this.rowsInput = this.buildNumberInput('rows', 'Rows', 15, 3, 50);
        this.colsInput = this.buildNumberInput('cols', 'Cols', 15, 3, 50);

        // Generate button
        this.generateBtn = document.createElement('button');
        this.generateBtn.className = 'toolbar__btn toolbar__btn--primary';
        this.generateBtn.textContent = 'Generate';
        this.generateBtn.type = 'button';

        // Solver group
        this.solverSelect = this.buildSelect(
            'solver',
            'Solver',
            solverNames.map(n => ({ value: n, label: SOLVER_LABELS[n] }))
        );

        // Solve button
        this.solveBtn = document.createElement('button');
        this.solveBtn.className = 'toolbar__btn toolbar__btn--secondary';
        this.solveBtn.textContent = 'Solve';
        this.solveBtn.type = 'button';
        this.solveBtn.disabled = true;

        // View mode toggles
        const viewGroup = document.createElement('div');
        viewGroup.className = 'toolbar__group toolbar__group--views';
        const viewLabel = document.createElement('span');
        viewLabel.className = 'toolbar__label';
        viewLabel.textContent = 'View';
        viewGroup.appendChild(viewLabel);
        const viewBtns = document.createElement('div');
        viewBtns.className = 'toolbar__view-btns';
        for (const { mode, label } of VIEW_MODES) {
            const btn = document.createElement('button');
            btn.className = 'toolbar__view-btn';
            btn.textContent = label;
            btn.type = 'button';
            btn.dataset['view'] = mode;
            btn.setAttribute('aria-label', `Switch to ${mode} view`);
            btn.addEventListener('click', () => {
                this.options.onViewChange(mode);
            });
            this.viewButtons.set(mode, btn);
            viewBtns.appendChild(btn);
        }
        viewGroup.appendChild(viewBtns);

        // Assemble menu
        this.menu.appendChild(this.buildGroup('Generator', this.generatorSelect));
        this.menu.appendChild(this.buildGroup('Rows', this.rowsInput));
        this.menu.appendChild(this.buildGroup('Cols', this.colsInput));
        this.menu.appendChild(this.generateBtn);
        this.menu.appendChild(document.createElement('hr'));
        this.menu.appendChild(this.buildGroup('Solver', this.solverSelect));
        this.menu.appendChild(this.solveBtn);
        this.menu.appendChild(document.createElement('hr'));
        this.menu.appendChild(viewGroup);

        // Assemble nav
        this.nav.appendChild(this.hamburger);
        this.nav.appendChild(this.menu);

        // Bind event handlers
        this.boundHamburgerClick = () => this.toggleMenu();
        this.boundGenerateClick = () => this.handleGenerate();
        this.boundSolveClick = () => this.handleSolve();
        this.boundDocumentClick = (e: MouseEvent) => {
            if (!this.nav.contains(e.target as Node)) {
                this.closeMenu();
            }
        };
    }

    mount(container: HTMLElement): void {
        container.appendChild(this.nav);

        this.hamburger.addEventListener('click', this.boundHamburgerClick);
        this.generateBtn.addEventListener('click', this.boundGenerateClick);
        this.solveBtn.addEventListener('click', this.boundSolveClick);
        document.addEventListener('click', this.boundDocumentClick);
    }

    unmount(): void {
        this.hamburger.removeEventListener('click', this.boundHamburgerClick);
        this.generateBtn.removeEventListener('click', this.boundGenerateClick);
        this.solveBtn.removeEventListener('click', this.boundSolveClick);
        document.removeEventListener('click', this.boundDocumentClick);

        this.nav.remove();
    }

    /** Update the active view button highlight. */
    setActiveView(mode: ViewMode): void {
        for (const [m, btn] of this.viewButtons) {
            btn.classList.toggle('toolbar__view-btn--active', m === mode);
            btn.setAttribute('aria-pressed', String(m === mode));
        }
    }

    /** Enable or disable the Solve button. */
    setSolveEnabled(enabled: boolean): void {
        this.solveBtn.disabled = !enabled;
    }

    /** Get the currently selected generator name. */
    getSelectedGenerator(): GeneratorName {
        return this.generatorSelect.value as GeneratorName;
    }

    /** Get the currently selected solver name. */
    getSelectedSolver(): SolverName {
        return this.solverSelect.value as SolverName;
    }

    /** Get the current rows value. */
    getRows(): number {
        return this.readSize(this.rowsInput);
    }

    /** Get the current cols value. */
    getCols(): number {
        return this.readSize(this.colsInput);
    }

    /** Parse a size input, clamping to its min/max (empty/invalid falls back to min). */
    private readSize(input: HTMLInputElement): number {
        const min = Number(input.min);
        const max = Number(input.max);
        const parsed = parseInt(input.value, 10);
        const value = Number.isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed));
        input.value = String(value);
        return value;
    }

    private handleGenerate(): void {
        this.options.onGenerate(
            this.generatorSelect.value as GeneratorName,
            this.getRows(),
            this.getCols()
        );
        this.closeMenu();
    }

    private handleSolve(): void {
        this.options.onSolve(this.solverSelect.value as SolverName);
        this.closeMenu();
    }

    private toggleMenu(): void {
        const isOpen = this.menu.classList.contains('toolbar__menu--open');
        if (isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    private openMenu(): void {
        this.menu.classList.add('toolbar__menu--open');
        this.hamburger.setAttribute('aria-expanded', 'true');
        this.hamburger.textContent = '✕';
    }

    private closeMenu(): void {
        this.menu.classList.remove('toolbar__menu--open');
        this.hamburger.setAttribute('aria-expanded', 'false');
        this.hamburger.textContent = '☰';
    }

    private buildSelect(
        id: string,
        _label: string,
        options: { value: string; label: string }[]
    ): HTMLSelectElement {
        const select = document.createElement('select');
        select.id = `toolbar-${id}`;
        select.className = 'toolbar__select';
        for (const opt of options) {
            const el = document.createElement('option');
            el.value = opt.value;
            el.textContent = opt.label;
            select.appendChild(el);
        }
        return select;
    }

    private buildNumberInput(
        id: string,
        _label: string,
        value: number,
        min: number,
        max: number
    ): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'number';
        input.id = `toolbar-${id}`;
        input.className = 'toolbar__number';
        input.value = String(value);
        input.min = String(min);
        input.max = String(max);
        return input;
    }

    private buildGroup(labelText: string, control: HTMLElement): HTMLElement {
        const group = document.createElement('div');
        group.className = 'toolbar__group';
        const label = document.createElement('label');
        label.className = 'toolbar__label';
        label.textContent = labelText;
        if (control.id) label.htmlFor = control.id;
        group.appendChild(label);
        group.appendChild(control);
        return group;
    }
}
