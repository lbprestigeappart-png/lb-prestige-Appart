import { SettingPage } from "@/components/admin/SettingPage";
export default function AccessPage() {
  return <SettingPage title="Codes & accès" subtitle="Codes porte, coffre et instructions d'arrivée" settingKey="access_codes"
    fields={[
      { key: "door", label: "Code porte (ex : 4782#)" },
      { key: "safe", label: "Code coffre" },
      { key: "instructions", label: "Instructions d'arrivée", type: "textarea", rows: 4 },
    ]} />;
}
