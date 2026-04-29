import { SettingPage } from "@/components/admin/SettingPage";
export default function KitchenPage() {
  return (
    <SettingPage
      title="Cuisine"
      subtitle="Informations affichées dans l'espace client"
      settingKey="kitchen"
      fields={[{ key: "text", label: "Description / instructions", type: "textarea", rows: 8 }]}
    />
  );
}
