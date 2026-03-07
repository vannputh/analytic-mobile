import type { ColorValue } from "react-native"
import { Text, TextInput, View } from "react-native"
import { GroupedSection } from "@/src/shared/components/native/grouped-section"
import { NativeDateField } from "@/src/shared/components/native/native-date-field"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

export interface CreateMediaFormState {
  title: string
  status: string
  medium: string
  platform: string
  startDate: string
}

interface MediaAddFormProps {
  form: CreateMediaFormState
  error: string | null
  onChange: (patch: Partial<CreateMediaFormState>) => void
}

export function MediaAddForm({ form, error, onChange }: MediaAddFormProps) {
  const { palette } = useAppTheme()

  return (
    <View style={{ gap: 20 }}>
      <GroupedSection title="Details" footer="Title is required. Other fields stay editable after creation in the entry detail view.">
        <FormInput
          autoFocus
          label="Title"
          palette={palette}
          placeholder="What are you adding?"
          value={form.title}
          onChangeText={(title) => onChange({ title })}
        />
        <Divider color={palette.border} />
        <FormInput
          label="Status"
          palette={palette}
          placeholder="Watching"
          value={form.status}
          onChangeText={(status) => onChange({ status })}
        />
        <Divider color={palette.border} />
        <FormInput
          label="Medium"
          palette={palette}
          placeholder="Movie"
          value={form.medium}
          onChangeText={(medium) => onChange({ medium })}
        />
        <Divider color={palette.border} />
        <FormInput
          label="Platform"
          palette={palette}
          placeholder="Optional"
          value={form.platform}
          onChangeText={(platform) => onChange({ platform })}
        />
      </GroupedSection>

      <GroupedSection title="Schedule">
        <NativeDateField
          label="Start Date"
          value={form.startDate}
          onChange={(startDate) => onChange({ startDate })}
        />
      </GroupedSection>

      {error ? (
        <Text selectable style={{ color: palette.danger, fontSize: 14 }}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

function FormInput({
  autoFocus = false,
  label,
  palette,
  placeholder,
  value,
  onChangeText
}: {
  autoFocus?: boolean
  label: string
  palette: ReturnType<typeof useAppTheme>["palette"]
  placeholder: string
  value: string
  onChangeText: (value: string) => void
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 8 }}>
      <Text selectable style={{ color: palette.textMuted, fontSize: 13, fontWeight: "600" }}>
        {label}
      </Text>
      <TextInput
        autoFocus={autoFocus}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        style={{
          color: palette.text,
          fontSize: 17,
          padding: 0
        }}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  )
}

function Divider({ color }: { color: ColorValue }) {
  return <View style={{ height: 1, backgroundColor: color, marginLeft: 16 }} />
}
