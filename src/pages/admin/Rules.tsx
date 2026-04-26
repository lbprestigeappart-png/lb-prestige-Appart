import { SettingPage } from "@/components/admin/SettingPage";
export default function RulesPage() {
  return <SettingPage title="Règlement intérieur" settingKey="house_rules"
    fields={[{ key: "text", label: "Contenu complet", type: "textarea", rows: 20 }]} />;
}
