import { SettingPage } from "@/components/admin/SettingPage";
export default function ParkingPage() {
  return (
    <SettingPage
      title="Parking"
      subtitle="Informations affichées dans l'espace client"
      settingKey="parking"
      fields={[{ key: "text", label: "Description / instructions", type: "textarea", rows: 8 }]}
    />
  );
}
