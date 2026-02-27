import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { FetchFiles, OpenInputFileDialog, OpenOutputDirectoryDialog, RunCLIFetch } from '../../wailsjs/go/main/App';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(100%)' }))
      ])
    ])
  ]
})
export class AppComponent implements OnInit {
  constructor(private readonly cdr: ChangeDetectorRef) { }

  status = 'Ready';
  inputFilePath = '';
  outputDirPath = '';
  manifestsDirPath = '';

  showAdvanced = false;
  maxConnections = 8;
  maxRetries = 3;
  simultaneousDownloads = 2;
  skipExisting = true;
  downloadInParallel = true;

  manifestModalOpen = false;
  settingsModalOpen = false;

  isDarkMode = false;

  overallProgress = 0;
  overallCancelled = 0;

  sources: Array<{
    id: string;
    title: string;
    path?: string;
    progress: number;
    accent: string;
    logs: string[];
    status?: string;
    playing?: boolean;
    collapsed?: boolean;
    stats?: { loaded: string | number; completed: string | number; failed: string | number; inProgress: string | number; skipped: string | number };
  }> = [];
  overallPlaying = false;

  get orderedSources() {
    const list = [...this.sources];
    const rank = (status?: string) => {
      if (status === 'downloading') return 0;
      if (status === 'paused') return 1;
      if (status === 'queued') return 2;
      if (status === 'completed') return 3;
      return 4;
    };
    return list.sort((a, b) => rank(a.status) - rank(b.status));
  }

  // Toast notification properties
  toasts: Array<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }> = [];
  private readonly maxToasts = 1;
  private toastIdCounter = 0;
  private readonly toastEnabled = false;

  ngOnInit() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.isDarkMode = true;
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.isDarkMode = e.matches;
    });

    this.sources = [
      {
        id: 'src-1',
        title: 'Manifest 1',
        path: '/Users/username/Documents/manifests/nbia',
        progress: 70,
        accent: '#2196F3',
        logs: ['Connecting…', 'Downloading series 1/5', 'Chunk 32/120', 'Writing file 00000001.dcm', 'Writing file 00000002.dcm', 'Rate 12.5 MB/s', 'ETA 01:45', 'Downloading series 1/5', 'Chunk 32/120', 'Writing file 00000001.dcm', 'Writing file 00000002.dcm', 'Rate 12.5 MB/s', 'ETA 01:45'],
        status: 'downloading',
        playing: true,
        collapsed: false,
        stats: { loaded: '4.5K', completed: '3K', failed: 4, inProgress: '1.5K', skipped: 60 }
      },
      {
        id: 'src-2',
        title: 'Manifest 2',
        path: '/Users/username/Documents/manifests/pathdb',
        progress: 25,
        accent: '#2196F3',
        logs: ['Queued…', 'Preparing download', 'Resolving metadata', 'Starting…'],
        status: 'queued',
        playing: false,
        collapsed: true,
        stats: { loaded: '7M', completed: '7M', failed: '55K', inProgress: 0, skipped: '31K' }
      },
      {
        id: 'src-3',
        title: 'Manifest 3',
        path: '/Users/username/Documents/manifests/crdc',
        progress: 58,
        accent: '#2196F3',
        logs: ['Downloading…', 'File 10/200', 'Rate 8.3 MB/s', 'ETA 02:14'],
        status: 'downloading',
        playing: true,
        collapsed: true,
        stats: { loaded: '4.5K', completed: '3K', failed: 4, inProgress: '1.5K', skipped: 60 }
      },
      {
        id: 'src-4',
        title: 'Manifest 4',
        path: '/Users/username/Documents/manifests/manifest4',
        progress: 12,
        accent: '#9C27B0',
        logs: ['Queued…', 'Waiting for slot'],
        status: 'queued',
        playing: false,
        collapsed: true,
        stats: { loaded: '1.2K', completed: 0, failed: 0, inProgress: 0, skipped: 0 }
      },
      {
        id: 'src-5',
        title: 'Manifest 5',
        path: '/Users/username/Documents/manifests/manifest5',
        progress: 100,
        accent: '#4caf50',
        logs: ['Completed successfully'],
        status: 'completed',
        playing: false,
        collapsed: true,
        stats: { loaded: '8.3K', completed: '8.3K', failed: 0, inProgress: 0, skipped: 2 }
      },
      {
        id: 'src-6',
        title: 'Manifest 6',
        path: '/Users/username/Documents/manifests/manifest6',
        progress: 45,
        accent: '#ff9800',
        logs: ['Downloading…', 'Series 2/4', 'Chunk 14/60'],
        status: 'downloading',
        playing: true,
        collapsed: true,
        stats: { loaded: '2.1K', completed: '900', failed: 1, inProgress: '1.2K', skipped: 0 }
      },
      {
        id: 'src-7',
        title: 'Manifest 7',
        path: '/Users/username/Documents/manifests/manifest7',
        progress: 0,
        accent: '#607d8b',
        logs: ['Paused by user'],
        status: 'paused',
        playing: false,
        collapsed: true,
        stats: { loaded: 0, completed: 0, failed: 0, inProgress: 0, skipped: 0 }
      },
      {
        id: 'src-8',
        title: 'Manifest 8',
        path: '/Users/username/Documents/manifests/manifest8',
        progress: 77,
        accent: '#2196F3',
        logs: ['Downloading…', 'File 77/100'],
        status: 'downloading',
        playing: true,
        collapsed: true,
        stats: { loaded: '3.7K', completed: '2.8K', failed: 3, inProgress: '900', skipped: 5 }
      }
    ];

    this.enforceSingleActive();
    this.updateOverallProgress();
  }

  toggleOverallPlay() {
    const shouldPlay = !this.overallPlaying;
    if (shouldPlay) {
      const next = this.sources.find(s => s.status !== 'completed');
      this.animateCardReorder(() => this.enforceSingleActive(next ? next.id : undefined));
      this.scrollDownloadsToTop();
    } else {
      this.animateCardReorder(() => this.enforceSingleActive(null));
    }
  }

  toggleSourceCollapse(id: string) {
    try {
      if (typeof window !== 'undefined' && typeof window.getSelection === 'function') {
        const sel = window.getSelection();
        if (sel && sel.toString().length > 0) return;
      }
    } catch (e) {
    }

    const s = this.sources.find(x => x.id === id);
    if (s) {
      s.collapsed = !s.collapsed;
    }
  }

  toggleSourcePlay(id: string, ev?: Event) {
    if (ev) ev.stopPropagation();
    const s = this.sources.find(x => x.id === id);
    if (s) {
      const shouldPlay = !s.playing;
      this.animateCardReorder(() => this.enforceSingleActive(shouldPlay ? s.id : null));
      if (!shouldPlay) {
        this.showToast(`${s.title} download paused.`, 'warning');
      } else {
        this.scrollDownloadsToTop();
      }
    }
  }

  cancelSource(id: string) {
    const index = this.sources.findIndex(x => x.id === id);
    if (index !== -1) {
      const sourceName = this.sources[index].title;

      if (typeof document === 'undefined') {
        this.removeSourceAtIndex(index, sourceName);
        return;
      }

      const card = document.querySelector<HTMLElement>(`.sources-cards .source-card[data-source-id="${id}"]`);
      if (!card) {
        this.removeSourceAtIndex(index, sourceName);
        return;
      }

      card.classList.add('removing');
      window.setTimeout(() => {
        this.animateCardReorder(() => {
          const idx = this.sources.findIndex(x => x.id === id);
          if (idx !== -1) {
            this.removeSourceAtIndex(idx, sourceName);
          }
        });
      }, 180);
    }
  }

  cancelAllDownloads() {
    this.overallCancelled += this.sources.length;
    this.sources = [];
    this.overallPlaying = false;
    this.overallProgress = 0;
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
  }

  openSettingsModal() {
    this.settingsModalOpen = true;
  }

  closeSettingsModal() {
    this.settingsModalOpen = false;
  }

  openManifestModal() {
    this.manifestModalOpen = true;
  }

  closeManifestModal() {
    this.manifestModalOpen = false;
  }

  onManifestSubmit() {
    this.onAddManifest();
    this.closeManifestModal();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.manifestModalOpen) {
      this.closeManifestModal();
      return;
    }
    if (this.settingsModalOpen) {
      this.closeSettingsModal();
    }
  }

  onSelectOutputDirectory() {
    OpenOutputDirectoryDialog().then((dirPath: string) => {
      if (dirPath) {
        this.outputDirPath = dirPath;
      }
    }).catch(err => {
      this.status = "Error: " + err;
    });
  }

  onSelectManifestsDirectory() {
    OpenOutputDirectoryDialog().then((dirPath: string) => {
      if (dirPath) {
        this.manifestsDirPath = dirPath;
      }
    }).catch(err => {
      this.status = "Error: " + err;
    });
  }

  // Handler invoked by the "Add a Manifest" button in the empty state.
  // Opens the manifests directory selector so the user can pick or add manifests.
  onAddManifest() {
    this.onSelectManifestsDirectory();
  }

  onFetchFiles() {
    if (!this.inputFilePath || !this.outputDirPath) {
      this.status = "Please select an input TCIA file, an output directory, and a Manifests directory.";
      this.showToast("Please select an input TCIA file and an output directory.", 'error');
      return;
    }

    const cliPath = '../nbia-data-retriever-cli';
    const parts: string[] = [];
    parts.push(cliPath);
    parts.push('-i');
    parts.push(`"${this.inputFilePath}"`);
    parts.push('--output');
    parts.push(`"${this.outputDirPath}"`);
    parts.push('--max-connections');
    parts.push(String(this.maxConnections));
    parts.push('--max-retries');
    parts.push(String(this.maxRetries));
    parts.push('--processes');
    parts.push(String(this.simultaneousDownloads));
    if (this.downloadInParallel) {
      parts.push('--download-in-parallel');
    }
    if (this.skipExisting) {
      parts.push('--skip-existing');
    }
    const cmdStr = parts.join(' ');

    this.status = 'Running: ' + cmdStr;

    RunCLIFetch(this.inputFilePath, this.outputDirPath, this.maxConnections, this.maxRetries, this.simultaneousDownloads, this.skipExisting, this.downloadInParallel)
      .then((result: string) => {
        this.status = result;
      })
      .catch(err => {
        this.status = "Error: " + err;
      });
  }

  onSelectInputFile() {
    OpenInputFileDialog().then((filePath: string) => {
      if (filePath) {
        this.inputFilePath = filePath;
      }
    }).catch(err => {
      this.status = "Error: " + err;
    });
  }

  setSources(sources: Array<{ id: string; title: string; path?: string; progress: number; accent: string; logs: string[]; status?: string; }>) {
    const list = (sources || []).map((s, idx) => ({
      ...s,
      playing: (s as any).playing ?? false,
      collapsed: (s as any).collapsed ?? (idx !== 0)
    }));
    this.sources = list;
    this.overallCancelled = 0;
    this.enforceSingleActive();
    this.updateOverallProgress();
  }

  updateSourceProgress(id: string, progress: number) {
    const s = this.sources.find(x => x.id === id);
    if (s) {
      s.progress = Math.max(0, Math.min(100, Math.round(progress)));
      this.updateOverallProgress();
    }
  }

  appendSourceLog(id: string, line: string) {
    const s = this.sources.find(x => x.id === id);
    if (s) {
      s.logs.push(line);
    }
  }

  updateOverallProgress() {
    const list = this.sources ?? [];
    let sum = 0;
    for (const s of list) sum += (s.progress ?? 0);
    this.overallProgress = list.length ? Math.round(sum / list.length) : 0;
  }

  get overallCompleted(): number {
    return this.sumStat('completed', 'completed');
  }

  get overallFailed(): number {
    return this.sumStat('failed', 'failed');
  }

  get overallSkipped(): number {
    return this.sumStat('skipped', 'skipped');
  }

  get overallInProgress(): number {
    return this.sumStat('inProgress', 'downloading');
  }

  private sumStat(statKey: 'completed' | 'failed' | 'skipped' | 'inProgress', fallbackStatus: string): number {
    let total = 0;
    for (const source of this.sources || []) {
      if (source.stats && source.stats[statKey] !== undefined && source.stats[statKey] !== null) {
        total += this.parseCount(source.stats[statKey]);
        continue;
      }
      if (source.status === fallbackStatus) {
        total += 1;
      }
    }
    return total;
  }

  private parseCount(value: string | number): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? Math.round(value) : 0;
    }

    const normalized = String(value).trim().replace(/,/g, '');
    if (!normalized) return 0;

    const match = normalized.match(/^([0-9]*\.?[0-9]+)\s*([kmb])?$/i);
    if (!match) {
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? Math.round(parsed) : 0;
    }

    const amount = Number(match[1]);
    const suffix = (match[2] || '').toUpperCase();
    const multiplier = suffix === 'K' ? 1000 : suffix === 'M' ? 1000000 : suffix === 'B' ? 1000000000 : 1;
    return Math.round(amount * multiplier);
  }

  formatCompactCount(value: number): string {
    const absolute = Math.abs(value);
    if (absolute >= 1000000000) {
      const compact = value / 1000000000;
      return `${Number.isInteger(compact) ? compact.toFixed(0) : compact.toFixed(1)}B`;
    }
    if (absolute >= 1000000) {
      const compact = value / 1000000;
      return `${Number.isInteger(compact) ? compact.toFixed(0) : compact.toFixed(1)}M`;
    }
    if (absolute >= 1000) {
      const compact = value / 1000;
      return `${Number.isInteger(compact) ? compact.toFixed(0) : compact.toFixed(1)}K`;
    }
    return String(value);
  }

  get allPaused(): boolean {
    if (!this.sources || this.sources.length === 0) return false;
    return this.sources.every(s => !s.playing);
  }

  /**
   * Show a toast notification
   * @param message The message to display
   * @param type The type of toast: 'success' (green), 'error' (red), 'info' (blue), 'warning' (orange)
   */
  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 5000) {
    // Ensure only one toast is visible at a time
    this.toasts = [];

    if (!this.toastEnabled) {
      return;
    }

    const toast = {
      id: this.toastIdCounter++,
      message,
      type
    };

    this.toasts.push(toast);

    // Auto-hide after `duration` milliseconds unless duration === 0 (persistent)
    if (duration > 0) {
      setTimeout(() => this.hideToast(toast.id), duration);
    }
  }

  /**
   * Hide a specific toast notification
   */
  hideToast(id: number) {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index !== -1) {
      this.toasts.splice(index, 1);
    }
  }

  trackBySourceId(_index: number, source: { id: string }) {
    return source.id;
  }

  private enforceSingleActive(activeId?: string | null) {
    let hasActive = false;
    for (const source of this.sources) {
      const shouldBeActive = activeId === null
        ? false
        : (activeId ? source.id === activeId : (!hasActive && !!source.playing));
      if (shouldBeActive && !hasActive) {
        source.playing = true;
        hasActive = true;
        if (source.status !== 'completed') {
          source.status = 'downloading';
        }
      } else {
        source.playing = false;
        if (source.status !== 'completed') {
          source.status = 'paused';
        }
      }
    }
    this.overallPlaying = hasActive;
  }

  private scrollDownloadsToTop() {
    requestAnimationFrame(() => {
      const container = document.querySelector('.sources-cards');
      if (container && 'scrollTo' in container) {
        (container as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  private removeSourceAtIndex(index: number, sourceName: string) {
    this.sources.splice(index, 1);
    this.overallCancelled += 1;
    this.updateOverallProgress();
    if (this.sources.length === 0) {
      this.overallPlaying = false;
    }
    this.showToast(`${sourceName} download cancelled and removed.`, 'success');
  }

  private animateCardReorder(mutate: () => void) {
    if (typeof document === 'undefined') {
      mutate();
      return;
    }

    const firstPositions = this.captureCardPositions();
    mutate();
    this.cdr.detectChanges();

    requestAnimationFrame(() => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('.sources-cards .source-card[data-source-id]'));
      for (const card of cards) {
        const id = card.dataset['sourceId'];
        if (!id) continue;
        const first = firstPositions.get(id);
        if (!first) continue;

        const last = card.getBoundingClientRect();
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;
        if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;

        card.style.transition = 'none';
        card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        card.getBoundingClientRect();
        card.style.transition = 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)';
        card.style.transform = '';

        window.setTimeout(() => {
          card.style.transition = '';
        }, 320);
      }
    });
  }

  private captureCardPositions() {
    const positions = new Map<string, DOMRect>();
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.sources-cards .source-card[data-source-id]'));
    for (const card of cards) {
      const id = card.dataset['sourceId'];
      if (!id) continue;
      positions.set(id, card.getBoundingClientRect());
    }
    return positions;
  }
}
