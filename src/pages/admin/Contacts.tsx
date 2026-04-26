import { SettingPage } from "@/components/admin/SettingPage";
export default function ContactsPage() {
  return <SettingPage title="Contacts utiles" settingKey="useful_contacts"
    fields={[
      { key: "phone", label: "Téléphone conciergerie" },
      { key: "email", label: "E-mail conciergerie" },
      { key: "hours", label: "Horaires" },
    ]} />;
}
