// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  definePlugin,
  useClient,
  type DocumentActionComponent,
  type DocumentActionProps,
  type LayoutProps,
} from 'sanity';
import { UndoIcon, RedoIcon } from '@sanity/icons';
import { useToast } from '@sanity/ui';
import {
  redoDepth,
  redoLast,
  subscribeUndoRedo,
  undoLast,
  type RedoResult,
  type UndoResult,
} from '../undoRedo';

// =============================================================================
// Undo and redo, for everything (PORTS.md card 27)
// =============================================================================
// Two document actions and one keyboard shortcut over the transaction-log
// machinery in ../undoRedo.ts. Read that file's header first: it explains the
// mechanism, and it is where the safety rules live.
//
// THE KEYBOARD PART, and why it is shaped like this. A layout wrapper is the
// only place a plugin can register a window-level listener, and a layout
// wrapper cannot ask "which document is open?" - the router shape is internal
// and changes between versions. So the ACTIONS tell the shortcut. Both actions
// render whenever a document pane is open, so a tiny module-level register in
// this file learns the open document from them and forgets it on unmount. No
// document open, no shortcut: the key press falls through untouched.
//
// TEXT BOXES KEEP THEIR OWN UNDO. If focus is in an input, a textarea, a select
// or a rich-text editor, we do nothing at all and do not call preventDefault,
// so the browser's own per-field undo (and the Portable Text editor's) runs the
// way an editor expects. This shortcut is for everything OUTSIDE a text box:
// the section you just dragged, the swatch you just changed, the block you just
// deleted.
// =============================================================================

const API = { apiVersion: '2025-01-01' } as const;

// -----------------------------------------------------------------------------
// Which document is open
// -----------------------------------------------------------------------------
// A count per id, because both actions register the same document and either
// may unmount first. The newest registration wins, which is what an editor
// means by "this one" when two panes are open side by side.

const openDocuments: string[] = [];

function registerOpenDocument(documentId: string): () => void {
  openDocuments.push(documentId);
  return () => {
    const at = openDocuments.lastIndexOf(documentId);
    if (at >= 0) openDocuments.splice(at, 1);
  };
}

/** The draft id the keyboard shortcut should act on, or null. */
export function activeDocumentId(): string | null {
  return openDocuments.length > 0 ? openDocuments[openDocuments.length - 1] : null;
}

/** The draft id for a document action, whatever shape the pane handed us. */
function draftIdFor(props: DocumentActionProps): string {
  const fromDraft = (props.draft as { _id?: string } | null | undefined)?._id;
  if (fromDraft) return fromDraft;
  return props.id.startsWith('drafts.') ? props.id : `drafts.${props.id}`;
}

// -----------------------------------------------------------------------------
// Plain-voice results
// -----------------------------------------------------------------------------

const UNDO_REFUSALS: Record<string, { title: string; description: string }> = {
  nothing: {
    title: 'Nothing to undo yet',
    description: 'There is no unpublished change on this page for undo to step back to.',
  },
  stale: {
    title: 'Someone else edited since',
    description:
      'This page changed after the last thing you did, so undo has left it alone. Reload the page to catch up, or use Version history.',
  },
  'only-copy': {
    title: 'This would remove the only copy',
    description:
      'Undoing that far would delete this document, and there is no published version behind it. Delete it on purpose if that is what you want.',
  },
};

function toastForUndo(result: UndoResult) {
  if (result.ok) {
    return {
      status: 'success' as const,
      title: result.removedDraft ? 'Draft change undone' : 'Change undone',
      description: result.removedDraft
        ? 'The unpublished draft is gone. The published page is untouched.'
        : 'One step back. Press Ctrl+Shift+Z (Cmd+Shift+Z on a Mac) to put it back.',
    };
  }
  const copy = UNDO_REFUSALS[result.reason];
  return { status: 'warning' as const, ...copy };
}

function toastForRedo(result: RedoResult) {
  if (result.ok) {
    return {
      status: 'success' as const,
      title: 'Change put back',
      description: 'One step forward.',
    };
  }
  return result.reason === 'stale'
    ? {
        status: 'warning' as const,
        title: 'Someone else edited since',
        description: 'This page moved on, so there is nothing safe to put back.',
      }
    : {
        status: 'warning' as const,
        title: 'Nothing to put back',
        description: 'Redo only works straight after an undo, before anything else is typed.',
      };
}

// -----------------------------------------------------------------------------
// The hook both actions (and the shortcut) run through
// -----------------------------------------------------------------------------

/**
 * The half that does the work: one stable `run(documentId, direction)` that
 * reports honestly through a toast. No document id is baked in, so the keyboard
 * layer can call it for whatever document is open at the moment of the key
 * press without re-registering a listener on every pane change.
 */
function useUndoRedoRunner() {
  const client = useClient(API);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // A ref as well as state: a held-down Ctrl+Z must not fire a second undo
  // while the first is in flight, and it cannot wait for a re-render.
  const inFlight = useRef(false);

  const run = useCallback(
    async (documentId: string | null, direction: 'undo' | 'redo') => {
      if (!documentId || inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      try {
        const result =
          direction === 'undo'
            ? await undoLast(client, documentId)
            : await redoLast(client, documentId);
        toast.push(
          direction === 'undo'
            ? toastForUndo(result as UndoResult)
            : toastForRedo(result as RedoResult),
        );
      } catch (err) {
        console.error(`[undo-redo] ${direction} failed`, err);
        toast.push({
          status: 'error',
          title: direction === 'undo' ? 'Could not undo' : 'Could not put it back',
          description: 'Nothing was changed. Try again, or use Version history.',
        });
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [client, toast],
  );

  return { run, busy };
}

/**
 * The document-facing hook: the runner bound to one document, plus the two
 * things a button needs (is there anything to put back, and are we mid-flight),
 * plus the registration that tells the keyboard layer this document is open.
 */
export function useUndoRedo(documentId: string) {
  const { run, busy } = useUndoRedoRunner();

  useEffect(() => registerOpenDocument(documentId), [documentId]);

  const canRedo =
    useSyncExternalStore(
      subscribeUndoRedo,
      () => redoDepth(documentId),
      () => 0,
    ) > 0;

  const undo = useCallback(() => void run(documentId, 'undo'), [run, documentId]);
  const redo = useCallback(() => void run(documentId, 'redo'), [run, documentId]);

  return { undo, redo, canRedo, busy };
}

// -----------------------------------------------------------------------------
// The two document actions
// -----------------------------------------------------------------------------

export const UndoAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const documentId = draftIdFor(props);
  const { undo, busy } = useUndoRedo(documentId);
  const hasDraft = Boolean(props.draft);

  return {
    label: busy ? 'Undoing...' : 'Undo last change',
    icon: UndoIcon,
    disabled: busy || !hasDraft,
    title: hasDraft
      ? 'Step back one change: a section you added, a photo you cleared, a colour you picked. Ctrl+Z outside a text box does the same.'
      : 'Nothing to undo yet. There is no unpublished change on this page.',
    onHandle: () => {
      undo();
      props.onComplete?.();
    },
  };
};

export const RedoAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const documentId = draftIdFor(props);
  const { redo, canRedo, busy } = useUndoRedo(documentId);

  return {
    label: busy ? 'Putting it back...' : 'Redo',
    icon: RedoIcon,
    disabled: busy || !canRedo,
    title: canRedo
      ? 'Put back the change you just undid. Ctrl+Shift+Z does the same.'
      : 'Nothing to put back. Redo only works straight after an undo.',
    onHandle: () => {
      redo();
      props.onComplete?.();
    },
  };
};

// -----------------------------------------------------------------------------
// The keyboard layer
// -----------------------------------------------------------------------------

/** Selectors whose own undo must win: this shortcut stays out of them. */
const TEXT_ENTRY = 'input, textarea, select, [contenteditable="true"], [data-slate-editor]';

function isInTextEntry(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : null;
  if (el?.closest(TEXT_ENTRY)) return true;
  const active = typeof document !== 'undefined' ? document.activeElement : null;
  return Boolean(active?.closest(TEXT_ENTRY));
}

function UndoRedoShortcutLayout(props: LayoutProps) {
  const { run } = useUndoRedoRunner();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.altKey) return;
      const key = event.key.toLowerCase();
      const isUndo = key === 'z' && !event.shiftKey;
      const isRedo = (key === 'z' && event.shiftKey) || key === 'y';
      if (!isUndo && !isRedo) return;

      // Read the open document at the moment of the key press, not at render:
      // this listener outlives every pane that opens under it.
      const documentId = activeDocumentId();
      if (!documentId) return;
      // The editor is typing. Their text box owns this key.
      if (isInTextEntry(event.target)) return;

      event.preventDefault();
      void run(documentId, isUndo ? 'undo' : 'redo');
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [run]);

  return props.renderDefault(props);
}

/**
 * Registers the Ctrl+Z / Ctrl+Shift+Z (Cmd on a Mac) layer. The buttons are
 * document actions and are wired separately, in sanity.config.ts, because which
 * document types get them is a per-site decision.
 */
export const undoRedoShortcuts = definePlugin({
  name: 'undo-redo-shortcuts',
  studio: {
    components: {
      layout: UndoRedoShortcutLayout,
    },
  },
});
