import { Text, View } from "react-native"
import { useState } from "react"
import { FoodAnalyticsPanel } from "@/src/features/analytics/components/FoodAnalyticsPanel"
import { MediaAnalyticsPanel } from "@/src/features/analytics/components/MediaAnalyticsPanel"
import { useFoodEntries } from "@/src/features/food/hooks/useFoodEntries"
import { useMediaEntries } from "@/src/features/media/hooks/useMediaEntries"
import { GroupedSection } from "@/src/shared/components/native/grouped-section"
import { ScreenScrollView } from "@/src/shared/components/native/screen-scroll-view"
import { SegmentedSwitch } from "@/src/shared/components/workspace/SegmentedSwitch"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

type AnalyticsWorkspace = "media" | "food"

export function AnalyticsScreen() {
  const { palette } = useAppTheme()
  const [workspace, setWorkspace] = useState<AnalyticsWorkspace>("media")
  const { data: media } = useMediaEntries()
  const { data: food } = useFoodEntries()

  return (
    <ScreenScrollView>
      <View style={{ gap: 4 }}>
        <Text selectable style={{ color: palette.text, fontSize: 34, fontWeight: "700", letterSpacing: -0.6 }}>
          Analytics
        </Text>
        <Text selectable style={{ color: palette.textMuted, fontSize: 15 }}>
          Review the trends in your media and food tracking without leaving the native navigation flow.
        </Text>
      </View>

      <GroupedSection title="Workspace">
        <View style={{ padding: 12 }}>
          <SegmentedSwitch
            value={workspace}
            onChange={setWorkspace}
            options={[
              { value: "media", label: "Media" },
              { value: "food", label: "Food" }
            ]}
          />
        </View>
      </GroupedSection>

      {workspace === "media" ? <MediaAnalyticsPanel entries={media ?? []} /> : <FoodAnalyticsPanel entries={food ?? []} />}
    </ScreenScrollView>
  )
}
