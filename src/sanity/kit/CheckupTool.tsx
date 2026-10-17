// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// Checkup: "What needs attention", a top-bar tool (Studio kit, 2026-10-17)
// =============================================================================
// Ported from mas-monograms' CheckupTool onto @sanity/ui 4. READ-ONLY: it runs
// the rules in src/lib/studio-checkup.ts (pure, unit-tested) and points; it
// never changes anything. Each card has one plain sentence and a "Take me
// there" button that goes through the router (useStudioLink).
// =============================================================================

import { ActivityIcon } from '@sanity/icons/Activity';
import { Badge, Box, Button, Card, Flex, Spinner, Stack, Text } from '@sanity/ui';
import { isAllClear, type CheckResult, type Severity } from '../../lib/studio-checkup';
import { ToolHeading, useCheckup, useStudioLink } from './shared';
import type { KitConfig } from './types';

export const SEVERITY_TONE: Record<Severity, 'critical' | 'caution' | 'primary'> = {
  'Needs doing': 'critical',
  'Worth a look': 'caution',
  'For information': 'primary',
};

function ResultCard({ r }: { r: CheckResult }) {
  const linkTo = useStudioLink();
  const link = r.target ? linkTo(r.target) : null;
  return (
    <Card padding={4} radius={3} border tone={SEVERITY_TONE[r.severity]}>
      <Stack gap={4}>
        <Flex align="center" gap={3} wrap="wrap">
          <Badge tone={SEVERITY_TONE[r.severity]} padding={2} fontSize={2}>
            {r.severity}
          </Badge>
          <Text size={3} weight="semibold">
            {r.label}
          </Text>
        </Flex>
        <Text size={2} style={{ lineHeight: 1.6 }}>
          {r.detail}
        </Text>
        {link && (
          <Flex>
            <Button
              as="a"
              href={link.href}
              onClick={link.onClick}
              text={`${r.targetLabel ?? 'Take me there'} →`}
              tone="primary"
              mode="ghost"
              fontSize={2}
              padding={3}
            />
          </Flex>
        )}
      </Stack>
    </Card>
  );
}

export function makeCheckupTool(config: KitConfig) {
  return function CheckupTool() {
    const { results, failed, busy, run } = useCheckup(config);
    const todo = (results ?? []).filter((r) => r.severity !== 'For information');
    const info = (results ?? []).filter((r) => r.severity === 'For information');

    return (
      <Box padding={[4, 4, 5]} style={{ overflowY: 'auto', height: '100%' }}>
        <Stack gap={5} style={{ maxWidth: 760, margin: '0 auto' }}>
          <ToolHeading
            icon={ActivityIcon}
            lead="A quick look over the website for things worth fixing, such as a picture with no description or a link to a page that is gone. Nothing is changed here. It only points the way."
          >
            What needs attention
          </ToolHeading>

          <Flex>
            <Button
              text={busy ? 'Checking...' : 'Check again'}
              mode="ghost"
              fontSize={2}
              padding={3}
              disabled={busy}
              onClick={() => void run()}
            />
          </Flex>

          {failed ? (
            <Card padding={4} radius={3} tone="caution" border>
              <Text size={2}>
                The check could not finish just now. Your website is fine; press Check again in a
                minute.
              </Text>
            </Card>
          ) : results === null ? (
            <Flex align="center" gap={3}>
              <Spinner muted />
              <Text size={2} muted>
                Checking...
              </Text>
            </Flex>
          ) : (
            <Stack gap={3}>
              {isAllClear(results) && (
                <Card padding={4} radius={3} tone="positive" border>
                  <Flex align="center" gap={3} wrap="wrap">
                    <Badge tone="positive" padding={2} fontSize={2}>
                      All clear
                    </Badge>
                    <Text size={3}>Nothing needs fixing right now.</Text>
                  </Flex>
                </Card>
              )}
              {todo.map((r) => (
                <ResultCard key={r.id} r={r} />
              ))}
              {info.length > 0 && (
                <Box paddingTop={3}>
                  <Text size={2} weight="semibold">
                    Good to know
                  </Text>
                </Box>
              )}
              {info.map((r) => (
                <ResultCard key={r.id} r={r} />
              ))}
            </Stack>
          )}
        </Stack>
      </Box>
    );
  };
}
