/*
  # Add onboarded_at to organizations

  1. Changes
    - organizations: add `onboarded_at` (timestamptz, nullable)
      Stamped when the OnboardingWizard completes. NULL means the wizard
      has not been finished yet — lets us distinguish abandoned wizards
      from orgs that are live.

  2. Security
    - No policy changes. Existing admin UPDATE policy already covers writes
      to this column, and the existing member SELECT policy covers reads.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'onboarded_at'
  ) THEN
    ALTER TABLE organizations ADD COLUMN onboarded_at timestamptz;
  END IF;
END $$;
