// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// site-form-fixtures - two made-up forms for the form builder (PORTS.md card 194)
// =============================================================================
// The /styleguide/sections/ wall draws them, and /api/form/ accepts them ONLY when the Worker has
// MAIL_TEST_FIXTURES=1 (set in .dev.vars for `npm run preview`, never in production; the same
// switch as the mail fixtures, src/lib/mail-fixtures.ts). Their ids start with "fixture-", which
// no Sanity document id does.
// =============================================================================

export const FIXTURE_FORMS: Record<string, Record<string, unknown>> = {
  'fixture-signup': {
    _id: 'fixture-signup',
    title: 'Sign up to help',
    intro: 'Tell us how you would like to help and we will be in touch.',
    mode: 'standard',
    askForContact: true,
    allowAnonymous: false,
    recipient: 'office',
    recipientName: 'Office',
    questions: [
      {
        _key: 'q1',
        _type: 'formQuestion',
        label: 'Which would you like to help with?',
        kind: 'select',
        options: ['Welcome desk', 'Setting up', 'Clearing away'],
        required: true,
      },
      { _key: 'q2', _type: 'formQuestion', label: 'Phone (optional)', kind: 'phone' },
      { _key: 'q3', _type: 'formQuestion', label: 'Anything else?', kind: 'textarea' },
      { _key: 'q4', _type: 'formQuestion', label: 'I am over 18', kind: 'checkbox' },
      {
        _key: 'q5',
        _type: 'formTickQuestion',
        label: 'Which weeks could you help?',
        options: ['First week', 'Second week', 'Third week', 'Fourth week'],
      },
      { _key: 'q6', _type: 'formDateQuestion', label: 'When could you start?', notPast: true },
    ],
    submitLabel: 'Sign me up',
  },
  'fixture-private': {
    _id: 'fixture-private',
    title: 'A private note',
    intro: 'Only the person it goes to reads this.',
    mode: 'private',
    askForContact: true,
    allowAnonymous: true,
    recipient: 'office',
    recipientName: 'Office',
    questions: [
      {
        _key: 'p1',
        _type: 'formQuestion',
        label: 'Your note',
        kind: 'textarea',
        required: true,
      },
    ],
  },
};

/** The Form block on the /styleguide/sections/ wall (and its thumbnail). */
export const FIXTURE_FORM_BLOCK = {
  _type: 'formSection',
  _key: 'fixture-form',
  form: FIXTURE_FORMS['fixture-signup'],
};
