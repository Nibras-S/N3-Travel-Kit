import { Paper, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import type { PosterContact } from "./usePosterContact";
import formClasses from "../styles/EditorForm.module.css";

interface PosterContactFormProps {
  contact: PosterContact;
  onChange: (contact: PosterContact) => void;
}

export function PosterContactForm({ contact, onChange }: PosterContactFormProps) {
  return (
    <Paper className={formClasses.editor} withBorder p={20} radius={16} bg="white" style={{ borderColor: "#e2e8f0" }}>
      <Stack gap="md">
        <Text component="h2" m={0} size="sm" fw={600} c="#0f172a">Footer contact</Text>
        <TextInput
          label="Staff name (optional)"
          placeholder="e.g. Ayesha"
          value={contact.staffName}
          maxLength={50}
          onChange={(event) => onChange({ ...contact, staffName: event.currentTarget.value })}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            label="Phone number"
            type="tel"
            placeholder="e.g. +91 860 655 0235"
            value={contact.phone}
            maxLength={24}
            onChange={(event) => onChange({ ...contact, phone: event.currentTarget.value })}
          />
          <TextInput
            label="Additional number (optional)"
            type="tel"
            placeholder="Another contact number"
            value={contact.additionalPhone}
            maxLength={24}
            onChange={(event) => onChange({ ...contact, additionalPhone: event.currentTarget.value })}
          />
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}
