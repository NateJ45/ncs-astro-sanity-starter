// BusinessOverview.tsx — Panel 2 of the Start Here handbook.
// Single source of truth for the editor: live data from Sanity (services + site settings)
// alongside static reference info about the business, ideal client, and voice.
// Safe to edit by hand.

import React, { useEffect, useState } from 'react';
import { useClient } from 'sanity';
import { Box, Card, Container, Heading, Stack, Text } from '@sanity/ui';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServiceRow {
  name: string;
  price: string;
  bestFor: string;
}

interface TravelFeeTier {
  distanceLabel: string;
  fee: string;
}

interface SiteSettingsData {
  email: string | null;
  phone: string | null;
  availabilityStatus: string | null;
  serviceAreas: string[] | null;
  travelFees: TravelFeeTier[] | null;
  socialInstagram: string | null;
  socialFacebook: string | null;
}

interface LiveData {
  services: ServiceRow[];
  settings: SiteSettingsData;
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

const SERVICES_QUERY = `*[_type=="service"]|order(orderRank asc){name,price,bestFor}`;
const SETTINGS_QUERY = `*[_type=="siteSettings"][0]{email,phone,availabilityStatus,serviceAreas,travelFees,socialInstagram,socialFacebook}`;

interface NotesData {
  businessSummary: string | null;
  idealClient: string | null;
  voiceSummary: string | null;
  wordsToAvoid: string[] | null;
}
const NOTES_QUERY = `*[_type=="studioNotes"][0]{businessSummary, idealClient, voiceSummary, wordsToAvoid}`;

/** Split a text field on blank lines into paragraphs. */
function paragraphs(text?: string | null): string[] {
  return (text ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Loading skeleton shown while fetch is in progress. */
function LoadingCard({ label }: { label: string }) {
  return (
    <Card padding={4} radius={2} shadow={1} tone="transparent">
      <Text size={1} muted>Loading {label}...</Text>
    </Card>
  );
}

/** Shown when a fetch fails gracefully. */
function ErrorCard({ label }: { label: string }) {
  return (
    <Card padding={4} radius={2} shadow={1} tone="caution">
      <Text size={1}>
        Could not load {label} right now. Open Site Settings or Content to see the current values.
      </Text>
    </Card>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BusinessOverview() {
  const client = useClient({ apiVersion: '2024-01-01' });

  const [services, setServices] = useState<ServiceRow[] | null>(null);
  const [settings, setSettings] = useState<SiteSettingsData | null>(null);
  const [notes, setNotes] = useState<NotesData | null>(null);
  const [servicesError, setServicesError] = useState(false);
  const [settingsError, setSettingsError] = useState(false);

  useEffect(() => {
    // Fetch services
    client
      .fetch<ServiceRow[]>(SERVICES_QUERY)
      .then((data) => setServices(data ?? []))
      .catch(() => setServicesError(true));

    // Fetch site settings
    client
      .fetch<SiteSettingsData | null>(SETTINGS_QUERY)
      .then((data) => setSettings(data ?? null))
      .catch(() => setSettingsError(true));

    // Fetch business notes (optional — a failure does not break the live sections)
    client
      .fetch<NotesData | null>(NOTES_QUERY)
      .then((data) => setNotes(data ?? null))
      .catch(() => { /* notes are optional; the live sections still render */ });
  }, [client]);

  return (
    <Container width={1} padding={4}>
      <Stack space={6}>

        {/* Header */}
        <Box>
          <Heading as="h1" size={3}>
            Your business at a glance
          </Heading>
          <Box marginTop={3}>
            <Text muted size={1}>
              The live sections below are pulled directly from your Services and Site Settings,
              so they are always current. To change anything, edit those documents.
            </Text>
          </Box>
        </Box>

        {/* ── LIVE: Services + prices ─────────────────────────────────────── */}
        <Card padding={4} radius={2} shadow={1} tone="default">
          <Stack space={4}>
            <Heading as="h2" size={1}>
              Your services and prices (live)
            </Heading>

            {/* Loading */}
            {services === null && !servicesError && (
              <LoadingCard label="services" />
            )}

            {/* Error */}
            {servicesError && (
              <ErrorCard label="services" />
            )}

            {/* Data */}
            {services !== null && services.length === 0 && (
              <Text size={1} muted>No services found. Add them under Content, Services.</Text>
            )}
            {services !== null && services.length > 0 && (
              <Stack space={3}>
                {services.map((svc, i) => (
                  <Card key={i} padding={3} radius={2} tone="transparent" shadow={1}>
                    <Stack space={2}>
                      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
                        <Text size={1} weight="semibold">{svc.name ?? 'Unnamed service'}</Text>
                        <Text size={1}>{svc.price ?? '—'}</Text>
                      </Box>
                      {svc.bestFor ? (
                        <Text size={1} muted>Best for: {svc.bestFor}</Text>
                      ) : null}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </Stack>
        </Card>

        {/* ── LIVE: Contact + availability + service areas ─────────────────── */}
        <Card padding={4} radius={2} shadow={1} tone="default">
          <Stack space={4}>
            <Heading as="h2" size={1}>
              Contact, availability, and service areas (live)
            </Heading>

            {/* Loading */}
            {settings === null && !settingsError && (
              <LoadingCard label="site settings" />
            )}

            {/* Error */}
            {settingsError && (
              <ErrorCard label="site settings" />
            )}

            {/* Data */}
            {settings !== null && (
              <Stack space={3}>

                {settings.availabilityStatus ? (
                  <Box>
                    <Text size={1} weight="semibold">Availability</Text>
                    <Box marginTop={1}>
                      <Text size={1}>{settings.availabilityStatus}</Text>
                    </Box>
                  </Box>
                ) : null}

                {settings.email ? (
                  <Box>
                    <Text size={1} weight="semibold">Email</Text>
                    <Box marginTop={1}>
                      <Text size={1}>{settings.email}</Text>
                    </Box>
                  </Box>
                ) : null}

                {settings.phone ? (
                  <Box>
                    <Text size={1} weight="semibold">Phone</Text>
                    <Box marginTop={1}>
                      <Text size={1}>{settings.phone}</Text>
                    </Box>
                  </Box>
                ) : null}

                {settings.socialInstagram ? (
                  <Box>
                    <Text size={1} weight="semibold">Instagram</Text>
                    <Box marginTop={1}>
                      <Text size={1}>{settings.socialInstagram}</Text>
                    </Box>
                  </Box>
                ) : null}

                {settings.socialFacebook ? (
                  <Box>
                    <Text size={1} weight="semibold">Facebook</Text>
                    <Box marginTop={1}>
                      <Text size={1}>{settings.socialFacebook}</Text>
                    </Box>
                  </Box>
                ) : null}

                {settings.serviceAreas && settings.serviceAreas.length > 0 ? (
                  <Box>
                    <Text size={1} weight="semibold">Service areas</Text>
                    <Box marginTop={1}>
                      <Text size={1}>{settings.serviceAreas.join(', ')}</Text>
                    </Box>
                  </Box>
                ) : null}

                {settings.travelFees && settings.travelFees.length > 0 ? (
                  <Box>
                    <Text size={1} weight="semibold">Travel fee tiers</Text>
                    <Box marginTop={1}>
                      <Stack space={1}>
                        {settings.travelFees.map((tier, i) => (
                          <Text key={i} size={1}>
                            {tier.distanceLabel}: {tier.fee}
                          </Text>
                        ))}
                      </Stack>
                    </Box>
                  </Box>
                ) : null}

              </Stack>
            )}
          </Stack>
        </Card>

        {/* ── EDITABLE: Who you are ───────────────────────────────────────── */}
        {notes?.businessSummary && (
          <Card padding={4} radius={2} shadow={1} tone="default">
            <Stack space={3}>
              <Heading as="h2" size={1}>Who you are</Heading>
              {paragraphs(notes.businessSummary).map((p, i) => (<Text key={i} size={1}>{p}</Text>))}
            </Stack>
          </Card>
        )}

        {/* ── EDITABLE: Your ideal client ─────────────────────────────────── */}
        {notes?.idealClient && (
          <Card padding={4} radius={2} shadow={1} tone="default">
            <Stack space={3}>
              <Heading as="h2" size={1}>Your ideal client</Heading>
              {paragraphs(notes.idealClient).map((p, i) => (<Text key={i} size={1}>{p}</Text>))}
            </Stack>
          </Card>
        )}

        {/* ── EDITABLE: Your voice ────────────────────────────────────────── */}
        {(notes?.voiceSummary || (notes?.wordsToAvoid && notes.wordsToAvoid.length > 0)) && (
          <Card padding={4} radius={2} shadow={1} tone="default">
            <Stack space={3}>
              <Heading as="h2" size={1}>Your voice (how you sound in writing)</Heading>
              {paragraphs(notes?.voiceSummary).map((p, i) => (<Text key={i} size={1}>{p}</Text>))}
              {notes?.wordsToAvoid && notes.wordsToAvoid.length > 0 && (
                <>
                  <Text size={1} weight="semibold">Words to skip:</Text>
                  <Text size={1}>{notes.wordsToAvoid.join(', ')}.</Text>
                </>
              )}
            </Stack>
          </Card>
        )}

      </Stack>
    </Container>
  );
}
