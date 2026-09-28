import { SettingsForm } from "@/components/research/settings-form";

export const metadata = {
  title: "Settings - Buddhi AI Research",
  description: "Configure your research environment, model tokens, and storage preferences.",
};

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage model access tokens and research workstation preferences.
        </p>
      </div>

      <SettingsForm />
    </div>
  );
}
