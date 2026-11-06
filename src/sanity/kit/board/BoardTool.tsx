// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// The Studio tool "Report" (Studio kit, PORTS.md card 218)
// =============================================================================
// Joins BoardScreen to the Studio: the signed-in editor's token for
// /api/studio/board/ (the same two checks as the Visitors card), and the site's
// Studio theme (scheme, fonts, the look's colours) for the screen's tokens.
// Registered beside Home by kit/index.tsx when kitConfig.features.report is on
// and kitConfig.board holds the site's config (src/config/board.ts).
// =============================================================================

import { useCallback } from 'react';
import { useClient } from 'sanity';
import { Box, useRootTheme } from '@sanity/ui';
import type { BoardAnswer } from '../../../lib/studio-board';
import { API_VERSION, studioToken } from '../shared';
import type { KitConfig } from '../types';
import { LOOK, SURFACE_RADIUS } from '../ui/look';
import { BoardScreen, type BoardLoad } from './BoardScreen';

/** The route's path. */
export const BOARD_PATH = '/api/studio/board/';

export function makeBoardTool(config: KitConfig) {
  const board = config.board!;
  return function BoardTool() {
    const client = useClient({ apiVersion: API_VERSION });
    const root = useRootTheme();
    const font = root.theme.v2?.font;
    const dark = root.scheme === 'dark';

    const load = useCallback<BoardLoad>(
      async (p, k) => {
        const token = studioToken(client);
        const r = await fetch(`${BOARD_PATH}?p=${p}&k=${encodeURIComponent(k)}`, {
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (r.status === 401) return 'signed-out';
        // No route at all (a site that has not taken it yet): say not connected.
        if (r.status === 404) return { configured: false, reason: 'no-binding' };
        const j = (await r.json().catch(() => null)) as BoardAnswer | null;
        if (!j || typeof j !== 'object' || !('configured' in j)) {
          return { configured: true, error: 'failed' };
        }
        return j;
      },
      [client],
    );

    return (
      <Box padding={[3, 4, 5]} style={{ overflowY: 'auto', height: '100%' }}>
        <div style={{ maxWidth: 1480, margin: '0 auto' }}>
          <BoardScreen
            config={board}
            load={load}
            helperName={config.helper.name}
            tokens={{
              scheme: dark ? LOOK.dark : LOOK.light,
              dark,
              fonts: {
                display: font?.heading.family ?? 'Georgia, serif',
                body: font?.text.family ?? 'system-ui, sans-serif',
              },
              radius: SURFACE_RADIUS,
            }}
          />
        </div>
      </Box>
    );
  };
}
