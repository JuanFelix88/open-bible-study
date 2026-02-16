import InstallPage from "@/app/components/InstallPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Install Open Bible Study",
  description:
    "Install the Open Bible Study app on your device for the best experience.",
};

export default function Page() {
  return (
    <InstallPage
      title="Open Bible Study"
      description="Install the app for a better reading experience, offline access, and more."
      iosButtonText="Install on iOS"
      androidButtonText="Install on Android"
      installedText="Installed"
      iosInstructions={{
        step1: "Tap the Share button in your browser menu",
        step2: "Scroll down and find 'Add to Home Screen'",
        step3: "Tap 'Add' in the top right corner",
      }}
    />
  );
}
