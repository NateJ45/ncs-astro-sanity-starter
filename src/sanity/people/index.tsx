// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// ncsPeopleTool - the "People" tool, for administrators only (PORTS.md card 176)
// =============================================================================
// Register it AFTER ncsStudioKit in sanity.config.ts, with the same kitConfig.
// The kit's tools reducer trims the top bar to `staffTools` in the staff view;
// this one runs after it and adds People for anyone whose real Sanity role is
// Administrator, in either view. So an administrator marked "Simple view"
// (card 175) still has it, and a Helper (Sanity's Editor role) never sees it.
// The route behind it checks the role again on every request
// (src/lib/studio-people.ts): hiding the tool is a courtesy, not the lock.
// `features.people: false` in kitConfig leaves it out entirely.
// =============================================================================
import { definePlugin } from 'sanity';
import { UsersIcon } from '@sanity/icons/Users';
import { isAdministrator } from '../../lib/studio-kit';
import type { KitConfig } from '../kit/types';
import { makePeopleTool } from './PeopleTool';

export const PEOPLE_TOOL = 'people';

export const ncsPeopleTool = definePlugin<KitConfig>((config) => {
  const PeopleTool = makePeopleTool(config);
  return {
    name: 'ncs-people-tool',
    tools: (prev, { currentUser }) => {
      if (config.features.people === false) return prev;
      if (!isAdministrator(currentUser) || prev.some((t) => t.name === PEOPLE_TOOL)) return prev;
      const tool = { name: PEOPLE_TOOL, title: 'People', icon: UsersIcon, component: PeopleTool };
      // Just before Checkup when it is there (the housekeeping end), else last.
      const at = prev.findIndex((t) => t.name === 'checkup');
      return at === -1 ? [...prev, tool] : [...prev.slice(0, at), tool, ...prev.slice(at)];
    },
  };
});
