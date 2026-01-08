import { Component, OnInit } from '@angular/core';
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
  status = 'Ready';
  inputFilePath = '';
  outputDirPath = '';
  manifestsDirPath = '';

  outputLogs: string[] = [];

  showAdvanced = false;
  maxConnections = 8;
  maxRetries = 3;
  simultaneousDownloads = 2;
  skipExisting = true;
  downloadInParallel = true;

  filesCollapsed = false;
  settingsCollapsed = true;
  outputCollapsed = true;

  isDarkMode = false;

  overallProgress = 0;

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
  }> = [];
  overallPlaying = false;

  // Toast notification properties
  toasts: Array<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }> = [];
  private readonly maxToasts = 3;
  private toastIdCounter = 0;

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
        title: 'NBIA',
        path: '/Users/username/Documents/manifests/nbia',
        progress: 70,
        accent: '#2196F3',
        logs: ['Connecting…', 'Downloading series 1/5', 'Chunk 32/120', 'Writing file 00000001.dcm', 'Writing file 00000002.dcm', 'Rate 12.5 MB/s', 'ETA 01:45', 'Rate 12.5 MB/s', 'ETA 01:45','Rate 12.5 MB/s', 'ETA 01:45','Rate 12.5 MB/s', 'ETA 01:45','Rate 12.5 MB/s', 'ETA 01:45','Rate 12.5 MB/s', 'ETA 01:45','Rate 12.5 MB/s', 'ETA 01:45','Rate 12.5 MB/s', 'ETA 01:45','Rate 12.5 MB/s', 'ETA 01:45','Rate 12.5 MB/s', 'ETA 01:45','Rate 12.5 MB/s', 'ETA 01:45','Rate 12.5 MB/s', 'ETA 01:45','Rate 12.5 MB/s', 'ETA 01:45'],
        status: 'downloading',
        playing: true,
        collapsed: false
      },
      {
        id: 'src-2',
        title: 'PathDB',
        path: '/Users/username/Documents/manifests/pathdb',
        progress: 25,
        accent: '#2196F3',
        logs: ['Queued…', 'Preparing download', 'Resolving metadata', 'Starting…'],
        status: 'queued',
        playing: false,
        collapsed: true
      },
      {
        id: 'src-3',
        title: 'CRDC',
        path: '/Users/username/Documents/manifests/crdc',
        progress: 58,
        accent: '#2196F3',
        logs: ['Downloading…', 'File 10/200', 'Rate 8.3 MB/s', 'ETA 02:14'],
        status: 'downloading',
        playing: true,
        collapsed: true
      }
    ];

    this.updateOverallProgress();
  }

  toggleOverallPlay() {
    this.overallPlaying = !this.overallPlaying;
    for (const s of this.sources) {
      s.playing = this.overallPlaying;
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
      s.playing = !s.playing;
      this.overallPlaying = this.sources.every(x => x.playing);
      
      if (!s.playing) {
        this.showToast(`${s.title} download paused.`, 'warning');
      }
    }
  }

  cancelSource(id: string) {
    const index = this.sources.findIndex(x => x.id === id);
    if (index !== -1) {
      const sourceName = this.sources[index].title;
      this.sources.splice(index, 1);
      this.updateOverallProgress();
      if (this.sources.length === 0) {
        this.overallPlaying = false;
      }
      this.showToast(`${sourceName} download cancelled and removed.`, 'success');
    }
  }

  cancelAllDownloads() {
    this.sources = [];
    this.overallPlaying = false;
    this.overallProgress = 0;
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
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
    this.appendLog(this.status);

    RunCLIFetch(this.inputFilePath, this.outputDirPath, this.maxConnections, this.maxRetries, this.simultaneousDownloads, this.skipExisting, this.downloadInParallel)
      .then((result: string) => {
        this.status = result;
        this.appendLog(result);
      })
      .catch(err => {
        this.status = "Error: " + err;
        this.appendLog(this.status);
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

  appendLog(line: string) {
    this.outputLogs.push(line);
  }

  updateOverallProgress() {
    const list = this.sources ?? [];
    let sum = 0;
    for (const s of list) sum += (s.progress ?? 0);
    this.overallProgress = list.length ? Math.round(sum / list.length) : 0;
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
  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    if (this.toasts.length >= this.maxToasts) {
      this.toasts.shift();
    }
    const toast = {
      id: this.toastIdCounter++,
      message,
      type
    };
    this.toasts.push(toast);
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
}
